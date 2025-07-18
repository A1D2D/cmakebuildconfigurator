const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

let statusBarCP;
let statusBarCT;

let toolchains = [];
let profiles = [];

function activate(context) {
	statusBarCP = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 5);
	statusBarCP.command = 'cmakebuildconfigurator.cmakeProfiles';

	statusBarCT = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 4);
	statusBarCT.command = 'cmakebuildconfigurator.cmakeTargets';

	//load configs:
	const cmakeProfilesConfig = vscode.workspace.getConfiguration().get('cmakebuildconfigurator.cmakeProfilesConfig');
	if (cmakeProfilesConfig) {
		updateStatusBarCP(cmakeProfilesConfig);
	} else updateStatusBarCP('default');

	const cmakeTargetsConfig = vscode.workspace.getConfiguration().get('cmakebuildconfigurator.cmakeTargetsConfig');
	if (cmakeTargetsConfig) {
		updateStatusBarCT(cmakeTargetsConfig);
	} else updateStatusBarCT('default');

	//commands:
	const runCL = vscode.commands.registerCommand('cmakebuildconfigurator.runCommand', function () {
		vscode.window.showInformationMessage('RunCommand Test');
	});

	const buildCL = vscode.commands.registerCommand('cmakebuildconfigurator.buildCommand', function () {
		vscode.window.showInformationMessage('BuildCommand Test');
	});

	const configureCmakeCL = vscode.commands.registerCommand('cmakebuildconfigurator.configurecmake', function () {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			vscode.window.showErrorMessage('No workspace folder open!');
			return;
		}

		const projectPath = workspaceFolders[0].uri.fsPath;
		runCMakeCommand(projectPath);
		vscode.window.showInformationMessage('Configuring cmake project Test');
	});

	const cmakeProfilesCL = vscode.commands.registerCommand('cmakebuildconfigurator.cmakeProfiles', async () => {
		const editString = '[Edit CMake Profiles]';

		const config = vscode.workspace.getConfiguration('cmakebuildconfigurator');
		profiles = config.get('cmakeProfiles') || [];
		let profileNames = profiles.map(profile => profile.name).filter(Boolean);
		profileNames.push(editString);

		const selected = await vscode.window.showQuickPick(profileNames, {
			placeHolder: 'Select CMake Profile'
		});

		if(editString == selected) {
			vscode.commands.executeCommand('cmakebuildconfigurator.configureCmakeProfiles');
			return;
		}

		if (selected) {
			vscode.workspace.getConfiguration().update('cmakebuildconfigurator.cmakeProfilesConfig', selected, vscode.ConfigurationTarget.Workspace);
			updateStatusBarCP(selected);
		}
	});

	const cmakeTargetsCL = vscode.commands.registerCommand('cmakebuildconfigurator.cmakeTargets', async () => {
		const editString = '[Edit Target Config]';
		let targets = ['L1', 'app', 'idk', 'project999'];
		targets.push(editString);
		const selected = await vscode.window.showQuickPick(targets, {
			placeHolder: 'Select Target'
		});
		if(editString == selected) {
			vscode.commands.executeCommand('cmakebuildconfigurator.configureCmakeTargets');
			return;
		}

		if (selected) {
			vscode.workspace.getConfiguration().update('cmakebuildconfigurator.cmakeTargetsConfig', selected, vscode.ConfigurationTarget.Workspace);
			updateStatusBarCT(selected);
		}
	});

	const configureCmakeSettingsCL = vscode.commands.registerCommand('cmakebuildconfigurator.configureCmakeSettings', async () => {
		let options = ['configure cmake: toolchains', 'configure cmake: profiles', 'configure cmake: targets'];
		const selected = await vscode.window.showQuickPick(options, {
			placeHolder: 'Configure Cmake'
		});
		switch (selected) {
			case 'configure cmake: toolchains':
				vscode.commands.executeCommand('cmakebuildconfigurator.configureCmakeToolchains');
				break;
			case 'configure cmake: profiles':
				vscode.commands.executeCommand('cmakebuildconfigurator.configureCmakeProfiles');
				break;
			case 'configure cmake: targets':
				vscode.commands.executeCommand('cmakebuildconfigurator.configureCmakeTargets');
				break;
			default:
				break;
		}
	});


	const configureCmakeToolchainsCL = vscode.commands.registerCommand('cmakebuildconfigurator.configureCmakeToolchains', () => {
		const panel = vscode.window.createWebviewPanel('toolchainManager', 'Manage Toolchains', vscode.ViewColumn.One, {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'html'))]
		});

		const config = vscode.workspace.getConfiguration('cmakebuildconfigurator');

		panel.webview.html = getWebviewToolchains(panel, context);

		panel.webview.onDidReceiveMessage(async message => {
			switch (message.command) {
				case 'saveToolchains':
					await config.update('toolchains', message.toolchains, vscode.ConfigurationTarget.Global);
					vscode.window.showInformationMessage('Toolchains saved!');
					break;
				case 'dataRequest':
					updateWebviewToolChains(panel);
					break;
				case 'action':
					vscode.window.showInformationMessage('action Test button');
					break;
			
				default:
					break;
			}
		});
		vscode.window.showInformationMessage('configureCmakeToolchains Test');
	});
	const configureCmakeProfilesCL = vscode.commands.registerCommand('cmakebuildconfigurator.configureCmakeProfiles', () => {
		const panel = vscode.window.createWebviewPanel('profileManager', 'Manage Cmake Profiles', vscode.ViewColumn.One, {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'html'))]
		});

		const config = vscode.workspace.getConfiguration('cmakebuildconfigurator');

		panel.webview.html = getWebviewProfiles(panel, context);

		panel.webview.onDidReceiveMessage(async message => {
			switch (message.command) {
				case 'saveProfiles':
					await config.update('cmakeProfiles', message.profiles, vscode.ConfigurationTarget.Workspace);
					vscode.window.showInformationMessage('Profile saved!');
					break;
				case 'dataRequest':
					updateWebviewProfiles(panel);
					break;
				case 'action':
					vscode.window.showInformationMessage('action Test button');
					break;
			
				default:
					break;
			}
		});
		vscode.window.showInformationMessage('configureCmakeProfiles Test');
	});
	const configureCmakeTargetsCL = vscode.commands.registerCommand('cmakebuildconfigurator.configureCmakeTargets', function () {
		vscode.window.showInformationMessage('configureCmakeTargets Test');
	});

	context.subscriptions.push(configureCmakeCL);
	context.subscriptions.push(statusBarCT);
	context.subscriptions.push(statusBarCP);
	context.subscriptions.push(runCL);
	context.subscriptions.push(cmakeProfilesCL);
	context.subscriptions.push(configureCmakeSettingsCL);

	context.subscriptions.push(configureCmakeToolchainsCL);
	context.subscriptions.push(configureCmakeProfilesCL);
	context.subscriptions.push(configureCmakeTargetsCL);

	console.log('Congratulations, your extension "cmakebuildconfigurator" is now active!');
}

function updateFileContext() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;

	const fileName = editor.document.fileName;
	const isCMake = fileName.endsWith('CmakeLists.txt');

	vscode.commands.executeCommand('setContext', 'cmakeFileActive', isCMake);
}

function deactivate() {}

function updateStatusBarCP(config) {
	statusBarCP.text = `Profile: ${config}`;
	statusBarCP.tooltip = 'Click to change cmake profile';
	statusBarCP.show();
}

function updateStatusBarCT(config) {
	statusBarCT.text = `Target: ${config}`;
	statusBarCT.tooltip = 'Click to change target profile';
	statusBarCT.show();
}

function getWebviewToolchains(panel, context) {
  const htmlPath = path.join(context.extensionPath, 'html', 'toolchainConfig.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

  // Replace paths to local resources with proper webview URIs
  html = html.replace(/{{root}}/g, panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'html'))));
  return html;
}

function updateWebviewToolChains(panel) {
	const config = vscode.workspace.getConfiguration('cmakebuildconfigurator');
	toolchains = config.get('toolchains') || [];
	panel.webview.postMessage({
		command: 'setToolchains',
		toolchains: toolchains
	});
}

function getWebviewProfiles(panel, context) {
  const htmlPath = path.join(context.extensionPath, 'html', 'profileConfig.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

  // Replace paths to local resources with proper webview URIs
  html = html.replace(/{{root}}/g, panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'html'))));
  return html;
}

function updateWebviewProfiles(panel) {
	const config = vscode.workspace.getConfiguration('cmakebuildconfigurator');
	profiles = config.get('cmakeProfiles') || [];
	panel.webview.postMessage({
		command: 'setProfiles',
		profiles: profiles
	});
}

function runCMakeCommand(projectPath) {
	const config = vscode.workspace.getConfiguration('cmakebuildconfigurator');
	profiles = config.get('cmakeProfiles') || [];

	const cmakeProfilesConfig = vscode.workspace.getConfiguration().get('cmakebuildconfigurator.cmakeProfilesConfig');
	const profile = profiles.find(p => p.name === cmakeProfilesConfig);
	if (!profile) throw new Error("Selected profile not found.");

	toolchains = config.get('toolchains') || [];
	const toolchain = toolchains.find(tc => tc.name === profile.toolchain);
	if (!toolchain) throw new Error("Toolchain not found set by the current selected cmake profile.");


	const output = vscode.window.createOutputChannel('CMake Build Config');
	output.clear();
	output.show(true);
	output.appendLine(`[CMake] Configuring in ${projectPath}...`);


	const cmakeExecutable = toolchain.cmake || 'cmake';
	const buildType = profile.buildType ? `-DCMAKE_BUILD_TYPE=${profile.buildType}` : '';
	const buildTool = toolchain.buildTool ? `-DCMAKE_MAKE_PROGRAM=${toolchain.buildTool}` : '';
	const cCompiler = toolchain.ccompiler ? `-DCMAKE_C_COMPILER=${toolchain.ccompiler}` : '';
	const cppCompiler = toolchain.cppcompiler ? `-DCMAKE_CXX_COMPILER=${toolchain.cppcompiler}` : '';
	const buildDir = profile.buildDirectory || profile.buildType ? `build-${profile.buildType.toLowerCase()}` : 'build';


	const buildToolType = toolchain.buildTool ? detectGeneratorFromBuildTool(toolchain.buildTool) : '';
	const optionalBuildTypeFlag = buildToolType ? '-G ${buildToolType}' : '';
	const generator = profile.generator ? `-G ${profile.generator}` : optionalBuildTypeFlag;

	const cmakeCmd = `${cmakeExecutable} ${buildType} ${buildTool} ${cCompiler} ${cppCompiler} ${generator} -S . -B ${buildDir}`.trim();

	const options = {
		cwd: projectPath,
		shell: true,
	};

	const child = cp.exec(cmakeCmd, options);
	
	child.stdout.on('data', (data) => output.append(data.toString()));
	child.stderr.on('data', (data) => output.append(data.toString()));

	child.on('close', (code) => {
		if (code !== 0) {
			output.appendLine(`[Error] CMake exited with code ${code}`);
		}
	});
}

function detectGeneratorFromBuildTool(buildToolPathOrName) {
	const name = buildToolPathOrName.toLowerCase();
	if (name.includes('ninja')) {
		return 'Ninja';
	}
	if (name.includes('mingw32-make') || name === 'make.exe' || name === 'make') {
		return 'MinGW Makefiles'; // or 'Unix Makefiles' if you want
	}
	if (name.includes('jom')) {
		return 'NMake Makefiles';
	}
	if (name.includes('msbuild')) {
		return 'Visual Studio 17 2022'; 
	}
	return null;
}

module.exports = {
	activate,
	deactivate
}
vscode.window.onDidChangeActiveTextEditor(updateFileContext);
vscode.workspace.onDidOpenTextDocument(updateFileContext);