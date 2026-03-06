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

        const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
        if (!repoRes.ok) throw new Error("Repository not found or rate limit exceeded.");
        const repoData = await repoRes.json();
        const branch = repoData.default_branch;

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

function renderTree(structure, container, rootName = "Repository") {
    container.innerHTML = '';
    
    const rootEl = document.createElement('div');
    rootEl.className = 'font-bold mb-2 flex items-center gap-2 text-[15px] text-white';
    rootEl.innerHTML = `<i class="devicon-github-original text-white"></i> ${rootName}`;
    container.appendChild(rootEl);

    const ul = createTreeList(structure);
    container.appendChild(ul);
}

function createTreeList(obj) {
    const ul = document.createElement('ul');
    ul.className = 'tree-list'; // Connects lines via CSS
    
    const keys = Object.keys(obj).filter(k => !k.startsWith('_')).sort((a, b) => {
        if (obj[a]._type === obj[b]._type) return a.localeCompare(b);
        return obj[a]._type === 'folder' ? -1 : 1;
    });

    keys.forEach(key => {
        const node = obj[key];
        const li = document.createElement('li');
        li.className = 'tree-node'; // Anchors the horizontal branch lines
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'tree-item text-gray-300';
        
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
            
            itemDiv.addEventListener('click', () => {
                const isHidden = childUl.classList.toggle('hidden');
                const icon = iconContainer.querySelector('i');
                if (isHidden) {
                    icon.className = 'fa-solid fa-folder text-[#79c0ff] w-5 text-center text-sm';
                } else {
                    icon.className = 'fa-solid fa-folder-open text-[#79c0ff] w-5 text-center text-sm';
                }
            });
        }
        
        ul.appendChild(li);
    });
    
    return ul;
}

// Upgraded Icon Detection Logic
function getIcon(filename, isFolder) {
    if (isFolder) return '<i class="fa-solid fa-folder-open text-[#79c0ff] w-5 text-center text-sm"></i>';
    
    const name = filename.toLowerCase();
    const ext = name.split('.').pop();
    
    // 1. Framework & Specific Detectors
    if (name.includes('react') || name.endsWith('.jsx') || name.endsWith('.tsx')) {
        return '<i class="devicon-react-original colored w-5 text-center text-sm"></i>';
    }
    if (name.includes('next') || name === 'next.config.js' || name === 'next.config.mjs') {
        return '<i class="devicon-nextjs-original text-white w-5 text-center text-sm"></i>';
    }
    if (name.includes('angular') || name.endsWith('.component.ts') || name === 'angular.json') {
        return '<i class="devicon-angularjs-plain colored w-5 text-center text-sm"></i>';
    }
    if (name.includes('three') || name.endsWith('.glsl')) {
        return '<i class="devicon-threejs-original text-white w-5 text-center text-sm"></i>';
    }
    if (name.includes('tailwind')) {
        return '<i class="devicon-tailwindcss-original colored w-5 text-center text-sm"></i>';
    }
    if (name === 'vite.config.js' || name === 'vite.config.ts') {
        return '<i class="devicon-vitejs-plain colored w-5 text-center text-sm"></i>';
    }

    // 2. Node.js vs Generic JS Detector
    const nodeEntryFiles = ['server.js', 'app.js', 'index.js', 'main.js', 'db.js', 'database.js'];
    if (nodeEntryFiles.includes(name) || name.includes('node') || name === 'package.json' || name === 'package-lock.json') {
        return '<i class="devicon-nodejs-plain colored w-5 text-center text-sm"></i>';
    }

    // 3. Media (Images & Audio) Detectors
    const imgExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'];
    const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'm4a'];
    
    if (imgExts.includes(ext)) {
        return '<i class="fa-regular fa-image text-emerald-400 w-5 text-center text-sm"></i>';
    }
    if (audioExts.includes(ext)) {
        return '<i class="fa-solid fa-music text-purple-400 w-5 text-center text-sm"></i>';
    }

    // 4. Standard Extensions
    const extMap = {
        'js': '<i class="devicon-javascript-plain colored w-5 text-center text-sm"></i>',
        'mjs': '<i class="devicon-javascript-plain colored w-5 text-center text-sm"></i>',
        'ts': '<i class="devicon-typescript-plain colored w-5 text-center text-sm"></i>',
        'html': '<i class="devicon-html5-plain colored w-5 text-center text-sm"></i>',
        'css': '<i class="devicon-css3-plain colored w-5 text-center text-sm"></i>',
        'json': '<i class="fa-solid fa-brackets-curly text-yellow-500 w-5 text-center text-sm"></i>',
        'md': '<i class="devicon-markdown-original text-gray-400 w-5 text-center text-sm"></i>',
        'py': '<i class="devicon-python-plain colored w-5 text-center text-sm"></i>',
        'gitignore': '<i class="devicon-git-plain colored w-5 text-center text-sm"></i>'
    };

    return extMap[ext] || '<i class="fa-regular fa-file text-gray-500 w-5 text-center text-sm"></i>';
}

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
        backgroundColor: '#0d1117', // Match the premium dark mode background for the export
        scale: 2 
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
            icon.className = 'fa-solid fa-folder-open text-[#79c0ff] w-5 text-center text-sm';
        } else {
            icon.className = 'fa-solid fa-folder text-[#79c0ff] w-5 text-center text-sm';
        }
    });
}

function showError(msg) {
    const errorMsg = document.getElementById('error-msg');
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
}
