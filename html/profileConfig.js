
/**
 * @typedef {Object} Profile
 * @property {string} name - The name of the profile.
 * @property {string} buildType - The build type (e.g., Debug, Release).
 * @property {string} toolchain - The toolchain to use for building.
 * @property {string} generator - The CMake generator to use.
 * @property {string[]} cmakeOptions - Additional CMake command line options.
 * @property {Object} cacheVariables - CMake cache variables to define.
 * @property {string} buildDirectory - The output directory for the build.
 * @property {string} buildOptions - Flags for the build step (e.g., -j 14).
 * @property {Object} environment - Additional environment variables for the build.
 * @property {string} environment.* - Key-value pairs for environment variables.
 */

/** 
 * @typedef {Object} DataMessage
 * @property {string} command - The command to execute.
 * @property {any} data - The data associated with the command.
 */

function log(...args) {
   document.getElementById('log').textContent += args.join(' ') + '\n';
}

/** @type {Profile[]} */
let profiles = [];



/** @param {Profile} prof - The profile to load */
function loadProfile(prof) {
   log("Loading profile:", prof.name);
   document.getElementById('rawData').textContent = JSON.stringify(prof, null, 2);
}

function renderProfileList() {
   log("Rendering profile list", profiles.length);
   let profList = document.getElementById('profile-list');
   profList.innerHTML = "";
   profiles.forEach((profile, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = profile.name || `Profile ${index}`;
      profList.appendChild(option);
   });
}


messageHandlers.push({ command: 'allProfiles', cb: function(data) {
   log("Received profiles:", profiles.length);
   profiles = data;
   renderProfileList();
}});


log("Initializing profileConfig.js");
vscode.postMessage({ command: 'dataRequest' });
