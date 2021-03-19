// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const path = require("path");
const fs = require("fs-extra");
const changeCase = require("change-case");
const { lstat } = require("fs");

let GlobalStoragePath = null;

function GetTargetDirectory(context)
{
	if (context)
	{
		const { fsPath } = context;
		const stats = fs.statSync(context.fsPath);
		return stats.isDirectory() ? fsPath : path.dirname(fsPath);
	}
	if (vscode.window.activeTextEditor)
	{
		return path.dirname(vscode.window.activeTextEditor.document.fileName);
	}

	return vscode.workspace.rootPath;
}


async function GenerateTemplate(context, isRenameTemplate)
{
	try
	{
		const workingPathDir = GetTargetDirectory(context);
		if(!workingPathDir)
		{
			vscode.window.showWarningMessage("Could not find valid folder to save template in.");
			return;
		}

		let templatePaths = await fs.readdir(GlobalStoragePath);
		const templateName = await vscode.window.showQuickPick(templatePaths, {
			placeHolder: "Choose a template"
		});

		// If no input data, do nothing
		if (!templateName)
		{
			return;
		}

		// Copy a template to path
		const srcPath = path.resolve(GlobalStoragePath, templateName);

		
		/** @type {vscode.InputBoxOptions} */
		var params = {
			prompt: "Name destination folder",
			placeHolder: templateName
		};
		
		let dstTemplateName = templateName;

		var input = await vscode.window.showInputBox(params);
		if(input != null && input.length > 0)
		{
			dstTemplateName = input;
		}

		const dstPath = path.resolve(workingPathDir, dstTemplateName);
		await fs.copy(srcPath, dstPath);
		
		vscode.window.showInformationMessage("Template: copied!");
	}
	catch (e)
	{
		console.error(e.stack);
		vscode.window.showErrorMessage(e.message);
	}
}

/**
 * @param {vscode.ExtensionContext} context
 */
async function SaveFolderAsTemplate(context)
{
	let targetPath = GetTargetDirectory(context);
	if(!targetPath)
	{
		vscode.window.showWarningMessage("Could not find valid folder to save as template.");
		return;
	}
	let nameOfFolder = path.basename(targetPath);

	/** @type {vscode.InputBoxOptions} */
	let params = {
		prompt: "Choose your template name",
		placeHolder: nameOfFolder
	};

	var templateName  = nameOfFolder;
	var input = await vscode.window.showInputBox(params);
	if(input != null && input.length > 0)
	{
		templateName = input;
	}
	
	let destinationFolder = GlobalStoragePath + "\\" + templateName;
	await fs.mkdir(destinationFolder);
	await fs.copy(targetPath, destinationFolder);

	vscode.window.showInformationMessage("Template: Saved Template Successfully!");
}

async function DeleteTemplate()
{
	let templatePaths = await fs.readdir(GlobalStoragePath);

	/** @type {vscode.QuickPickOptions} */
	let params = {
		placeHolder: "Pick a template to delete",
		canPickMany: true
	};

	/** @type {string[]} */
	// @ts-ignore
	var result = await vscode.window.showQuickPick(templatePaths, params);
	if(!result || result.length == 0)
	{
		return;
	}

	result.forEach((/** @type {string} */ template) => 
	{
		let folderToDelete = GlobalStoragePath + "\\" + template;
		fs.remove(folderToDelete);
	});

	vscode.window.showInformationMessage("Template: Deleted " + result.length + " Templates!");
}

/**
 * @param {vscode.ExtensionContext} context
 */
function ExtensionActivated(context)
{
	// our global storage folder is generated for us, we're only provided a path that we should use for storage.
	if(!fs.existsSync(context.globalStoragePath))
	{
		fs.mkdirSync(context.globalStoragePath);
	}

	// save it in a global variable so that we can access it without a context
	GlobalStoragePath = context.globalStoragePath;

	// This line of code will only be executed once when your extension is activated
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(
		vscode.commands.registerCommand("extension.insertTemplate", context =>
			GenerateTemplate(context, false)
		),
		vscode.commands.registerCommand("extension.saveFolderAsTemplate", context =>
			SaveFolderAsTemplate(context)
		),
		vscode.commands.registerCommand("extension.deleteTemplate", context =>
			DeleteTemplate()
		),
	);
}

exports.activate = ExtensionActivated;

// this method is called when your extension is deactivated
function ExtensionDeactivated() { }

module.exports = {
	activate: ExtensionActivated,
	deactivate: ExtensionDeactivated
};
