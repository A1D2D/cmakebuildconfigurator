let toolchains;

function render() {
   const list = document.getElementById('list');
   list.innerHTML = '';
   toolchains.forEach((tc, i) => {
      const div = document.createElement('div');
      div.innerHTML = `
         <input placeholder="Name" value="${tc.name}" data-i="${i}" data-k="name" />
         <input placeholder="Toolset" value="${tc.toolsetFolder}" data-i="${i}" data-k="toolsetFolder" />
         <button data-i="${i}" class="delete">Delete</button>
      `;
      list.appendChild(div);
   });
}

window.addEventListener('message', event => {
   const message = event.data;

   switch (message.command) {
      case 'setToolchains':
         toolchains = message.toolchains;
         render();
         break;
   }
});

document.getElementById('add').onclick = () => {
   toolchains.push({ name: '', toolsetFolder: '', cmake: '', buildTool: '', ccompiler: '', 'c++compiler': '', debugger: '' });
   render();
};

document.getElementById('save').onclick = () => {
   document.querySelectorAll('input').forEach(el => {
      const i = el.dataset.i;
      const key = el.dataset.k;
      toolchains[i][key] = el.value;
   });
   vscode.postMessage({ command: 'saveToolchains', toolchains });
};

document.getElementById('list').onclick = e => {
   if (e.target.classList.contains('delete')) {
      toolchains.splice(e.target.dataset.i, 1);
      render();
   }
};

document.getElementById('action').onclick = e => {
   vscode.postMessage({ command: 'action'});
};

vscode.postMessage({ command: 'dataRequest'});
