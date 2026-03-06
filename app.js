document.getElementById('fetch-btn').addEventListener('click', fetchRepoTree);
document.getElementById('copy-text-btn').addEventListener('click', copyTreeText);
document.getElementById('export-img-btn').addEventListener('click', exportAsImage);
document.getElementById('toggle-all-btn').addEventListener('click', toggleAllFolders);

let rawTreeData = [];
let treeStructure = {};
let isAllExpanded = true;

async function fetchRepoTree() {
    const urlInput = document.getElementById('repo-url').value.trim();
    const errorMsg = document.getElementById('error-msg');
    const treeRoot = document.getElementById('tree-root');
    const controls = document.getElementById('controls');

    // Parse the GitHub URL
    const match = urlInput.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
        showError("Invalid GitHub URL. Please use the format: https://github.com/owner/repo");
        return;
    }

    const [_, owner, repoName] = match;
    const repo = repoName.replace('.git', '');

    try {
        errorMsg.classList.add('hidden');
        treeRoot.innerHTML = '<div class="text-gray-500 animate-pulse">Fetching repository data...</div>';
        controls.classList.add('hidden');

        // 1. Get default branch
        const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
        if (!repoRes.ok) throw new Error("Repository not found or rate limit exceeded.");
        const repoData = await repoRes.json();
        const branch = repoData.default_branch;

        // 2. Get tree recursively
        const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
        if (!treeRes.ok) throw new Error("Failed to fetch tree structure.");
        const treeData = await treeRes.json();

        rawTreeData = treeData.tree;
        treeStructure = buildTreeStructure(rawTreeData);
        
        renderTree(treeStructure, treeRoot, repo);
        controls.classList.remove('hidden');

    } catch (err) {
        showError(err.message);
        treeRoot.innerHTML = '';
    }
}

// Convert flat GitHub API paths into a nested object
function buildTreeStructure(flatTree) {
    const root = {};
    flatTree.forEach(item => {
        const parts = item.path.split('/');
        let current = root;
        parts.forEach((part, index) => {
            if (!current[part]) {
                current[part] = {
                    _type: index === parts.length - 1 && item.type === 'blob' ? 'file' : 'folder',
                    _path: item.path
                };
            }
            current = current[part];
        });
    });
    return root;
}

// Render the tree DOM
function renderTree(structure, container, rootName = "Repository") {
    container.innerHTML = '';
    
    // Add root node
    const rootEl = document.createElement('div');
    rootEl.className = 'font-bold mb-2 flex items-center gap-2 text-lg text-gray-800';
    rootEl.innerHTML = `<i class="devicon-github-original colored"></i> ${rootName}`;
    container.appendChild(rootEl);

    const ul = createTreeList(structure);
    container.appendChild(ul);
}

function createTreeList(obj) {
    const ul = document.createElement('ul');
    
    // Sort: Folders first, then files, alphabetically
    const keys = Object.keys(obj).filter(k => !k.startsWith('_')).sort((a, b) => {
        if (obj[a]._type === obj[b]._type) return a.localeCompare(b);
        return obj[a]._type === 'folder' ? -1 : 1;
    });

    keys.forEach(key => {
        const node = obj[key];
        const li = document.createElement('li');
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'tree-item';
        
        const iconContainer = document.createElement('span');
        iconContainer.innerHTML = getIcon(key, node._type === 'folder');
        
        const textSpan = document.createElement('span');
        textSpan.textContent = key;
        
        itemDiv.appendChild(iconContainer);
        itemDiv.appendChild(textSpan);
        li.appendChild(itemDiv);

        if (node._type === 'folder') {
            const childUl = createTreeList(node);
            li.appendChild(childUl);
            
            // Toggle logic
            itemDiv.addEventListener('click', () => {
                const isHidden = childUl.classList.toggle('hidden');
                const icon = iconContainer.querySelector('i');
                if (isHidden) {
                    icon.className = 'fa-solid fa-folder text-blue-400';
                } else {
                    icon.className = 'fa-solid fa-folder-open text-blue-500';
                }
            });
        }
        
        ul.appendChild(li);
    });
    
    return ul;
}

// The core mapping logic to differentiate JS/TS frameworks
function getIcon(filename, isFolder) {
    if (isFolder) return '<i class="fa-solid fa-folder-open text-blue-500 w-5 text-center"></i>';
    
    const name = filename.toLowerCase();
    
    // Framework/Library Specific Detectors
    if (name.includes('react') || name.endsWith('.jsx') || name.endsWith('.tsx')) {
        return '<i class="devicon-react-original colored w-5 text-center text-lg"></i>';
    }
    if (name.includes('next') || name === 'next.config.js' || name === 'next.config.mjs') {
        return '<i class="devicon-nextjs-original text-black w-5 text-center text-lg"></i>';
    }
    if (name.includes('angular') || name.endsWith('.component.ts') || name === 'angular.json') {
        return '<i class="devicon-angularjs-plain colored w-5 text-center text-lg"></i>';
    }
    if (name.includes('node') || name === 'package.json' || name === 'package-lock.json') {
        return '<i class="devicon-nodejs-plain colored w-5 text-center text-lg"></i>';
    }
    if (name.includes('three') || name.endsWith('.glsl')) {
        return '<i class="devicon-threejs-original text-black w-5 text-center text-lg"></i>';
    }
    if (name.includes('tailwind')) {
        return '<i class="devicon-tailwindcss-original colored w-5 text-center text-lg"></i>';
    }
    if (name === 'vite.config.js' || name === 'vite.config.ts') {
        return '<i class="devicon-vitejs-plain colored w-5 text-center text-lg"></i>';
    }

    // Standard Extensions
    const ext = name.split('.').pop();
    const extMap = {
        'js': '<i class="devicon-javascript-plain colored w-5 text-center text-lg"></i>',
        'mjs': '<i class="devicon-javascript-plain colored w-5 text-center text-lg"></i>',
        'ts': '<i class="devicon-typescript-plain colored w-5 text-center text-lg"></i>',
        'html': '<i class="devicon-html5-plain colored w-5 text-center text-lg"></i>',
        'css': '<i class="devicon-css3-plain colored w-5 text-center text-lg"></i>',
        'json': '<i class="fa-solid fa-brackets-curly text-yellow-500 w-5 text-center"></i>',
        'md': '<i class="devicon-markdown-original text-gray-700 w-5 text-center text-lg"></i>',
        'py': '<i class="devicon-python-plain colored w-5 text-center text-lg"></i>',
        'gitignore': '<i class="devicon-git-plain colored w-5 text-center text-lg"></i>'
    };

    return extMap[ext] || '<i class="fa-regular fa-file text-gray-400 w-5 text-center"></i>';
}

// Format the object structure into ASCII text format
function copyTreeText() {
    let textOut = "";
    
    function generateTextTree(obj, prefix = "") {
        const keys = Object.keys(obj).filter(k => !k.startsWith('_')).sort((a, b) => {
            if (obj[a]._type === obj[b]._type) return a.localeCompare(b);
            return obj[a]._type === 'folder' ? -1 : 1;
        });

        keys.forEach((key, index) => {
            const isLast = index === keys.length - 1;
            const node = obj[key];
            
            textOut += prefix + (isLast ? "└── " : "├── ") + key + "\n";
            
            if (node._type === 'folder') {
                generateTextTree(node, prefix + (isLast ? "    " : "│   "));
            }
        });
    }

    const repoName = document.getElementById('repo-url').value.split('/').pop().replace('.git', '');
    textOut += repoName + "\n";
    generateTextTree(treeStructure);

    navigator.clipboard.writeText(textOut).then(() => {
        const btn = document.getElementById('copy-text-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        setTimeout(() => btn.innerHTML = originalText, 2000);
    });
}

function exportAsImage() {
    const container = document.getElementById('export-container');
    const btn = document.getElementById('export-img-btn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exporting...';
    
    html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2 // Higher resolution
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'repo-tree.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        btn.innerHTML = originalText;
    });
}

function toggleAllFolders() {
    const root = document.getElementById('tree-root');
    const uls = root.querySelectorAll('ul ul');
    const icons = root.querySelectorAll('.tree-item > span > i.fa-folder-open, .tree-item > span > i.fa-folder');
    
    isAllExpanded = !isAllExpanded;
    
    uls.forEach(ul => {
        if (isAllExpanded) ul.classList.remove('hidden');
        else ul.classList.add('hidden');
    });

    icons.forEach(icon => {
        if (isAllExpanded) {
            icon.className = 'fa-solid fa-folder-open text-blue-500 w-5 text-center';
        } else {
            icon.className = 'fa-solid fa-folder text-blue-400 w-5 text-center';
        }
    });
}

function showError(msg) {
    const errorMsg = document.getElementById('error-msg');
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
}
