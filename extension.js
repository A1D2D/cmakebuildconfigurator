const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

let statusBarCP;
let statusBarCT;

let toolchains = [];

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

	const cmakeProfilesCL = vscode.commands.registerCommand('cmakebuildconfigurator.cmakeProfiles', async () => {
		const editString = '[Edit CMake Profiles]';

		const config = vscode.workspace.getConfiguration('cmakebuildconfigurator');
		const profileConfig = config.get('cmakeProfiles') || [];
		let profiles = profileConfig.map(profile => profile.name).filter(Boolean);
		profiles.push(editString);

		const selected = await vscode.window.showQuickPick(profiles, {
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
		let profiles = ['L1', 'app', 'idk', 'project999'];
		profiles.push(editString);
		const selected = await vscode.window.showQuickPick(profiles, {
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

	const configureCmakeCL = vscode.commands.registerCommand('cmakebuildconfigurator.configureCmake', async () => {
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
		// toolchains = config.get('toolchains') || [];

		panel.webview.html = getWebviewContent(panel, context);

		panel.webview.onDidReceiveMessage(async message => {
			switch (message.command) {
				case 'saveToolchains':
					await config.update('toolchains', message.toolchains, vscode.ConfigurationTarget.Global);
					vscode.window.showInformationMessage('Toolchains saved!');
					break;
				case 'dataRequest':
					updateWebviewContent(panel);
					break;
				case 'action':
					break;
			
				default:
					break;
			}
		});
		vscode.window.showInformationMessage('configureCmakeToolchains Test');
	});
	const configureCmakeProfilesCL = vscode.commands.registerCommand('cmakebuildconfigurator.configureCmakeProfiles', function () {
		vscode.window.showInformationMessage('configureCmakeProfiles Test');
	});
	const configureCmakeTargetsCL = vscode.commands.registerCommand('cmakebuildconfigurator.configureCmakeTargets', function () {
		vscode.window.showInformationMessage('configureCmakeTargets Test');
	});

	context.subscriptions.push(statusBarCT);
	context.subscriptions.push(statusBarCP);
	context.subscriptions.push(runCL);
	context.subscriptions.push(cmakeProfilesCL);
	context.subscriptions.push(configureCmakeCL);

	context.subscriptions.push(configureCmakeToolchainsCL);
	context.subscriptions.push(configureCmakeProfilesCL);
	context.subscriptions.push(configureCmakeTargetsCL);

	console.log('Congratulations, your extension "cmakebuildconfigurator" is now active!');
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

function getWebviewContent(panel, context) {
  const htmlPath = path.join(context.extensionPath, 'html', 'toolchainConfig.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

	// Provide access to VSCode API from webview
	html = html.replace('<!-- inject-script -->',
		`<script>
		const vscode = acquireVsCodeApi();
		// const initialToolchains = ${JSON.stringify(toolchains)};
		</script>`
	);

  // Replace paths to local resources with proper webview URIs
  html = html.replace(/{{root}}/g, panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'html'))));

  return html;
}

function updateWebviewContent(panel) {
	const config = vscode.workspace.getConfiguration('cmakebuildconfigurator');
	toolchains = config.get('toolchains') || [];
	panel.webview.postMessage({
		command: 'setToolchains',
		toolchains: toolchains
	});
}

module.exports = {
	activate,
	deactivate
}
