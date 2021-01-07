import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { readjson, writejson } from './utils';

const GLOBAL_CONFIG = '.jenkins-jack.config.json'
export class PipelineConfig {
    public name: string;
    public params: any;
    public interactiveInputOverride: any;
    public folder: string | undefined;
    public path: string;
    public currentFolderPath: string;

    constructor(scriptPath: string, overwrite: boolean = false) {
        let parsed = path.parse(scriptPath);
        this.currentFolderPath = path.dirname(scriptPath);
        this.path = PipelineConfig.pathFromScript(scriptPath);

        // If config doesn't exist, write out defaults.
        if (!fs.existsSync(this.path) || overwrite) {
            this.name = parsed.name;
            this.params = null;
            this.folder = undefined;
            this.save();
            return;
        }

        let json = readjson(this.path);
        this.name = json.name;
        this.params = json.params;
        this.interactiveInputOverride = json.interactiveInputOverride;
        this.folder = json.folder;
    }

    toJSON(): any {
        return {
            name: this.name,
            params: this.params,
            interactiveInputOverride: this.interactiveInputOverride,
            folder: this.folder
        };
    }

    fromJSON(json: any): PipelineConfig {
        let pc = Object.create(PipelineConfig.prototype);
        return Object.assign(pc, json, {
            name: json.name,
            params: json.params,
            interactiveInputOverride: json.interactiveInputOverride,
            folder: json.folder
        });
    }

    get buildableName(): string {
        //let json = readjson(GLOBAL_CONFIG);
        let relativePathFromCurrentToWorkspace: string;
        let folderPath = this.currentFolderPath;
        let configPath: string;
        let json: any;

        console.log('currentFolderPath: ', this.currentFolderPath);

        if (vscode.workspace.workspaceFolders?.length === 1) {
            // Get relative path from current directory to workspace directory
            relativePathFromCurrentToWorkspace = path.relative(this.currentFolderPath,vscode.workspace.workspaceFolders[0].uri.path)
            configPath = path.join(folderPath, GLOBAL_CONFIG)

            if (fs.existsSync(configPath)) {
                json = readjson(configPath);
            } else {
                for (let index in relativePathFromCurrentToWorkspace.split(path.sep)) {
                    this.currentFolderPath = path.join(this.currentFolderPath, relativePathFromCurrentToWorkspace.split(path.sep)[index]);
                    configPath = path.join(path.normalize(this.currentFolderPath), GLOBAL_CONFIG)
                    if (fs.existsSync(configPath)) {
                        json = readjson(configPath);
                        break;
                    }
                }
            }
            console.log("Found - Global Config: ", configPath);
        }
        
        if (undefined === this.folder || '' === this.folder) {
            if (json.baseFolder) return path.join(json.baseFolder, this.name);
            else return `${this.name}`;
        }
        if (json.baseFolder) return path.join(json.baseFolder, this.folder, this.name);
        else return path.join(this.folder, this.name);
    }


    /**
     * Saves the current pipeline configuration to disk.
     */
    public save() {
        writejson(this.path, this);
    }

    /**
     * Updates the class properties with the saved
     * configuration values.
     */
    public update() {
        let json = readjson(this.path);
        this.name = json.name;
        this.params = json.params;
        this.interactiveInputOverride = json.interactiveInputOverride;
        this.folder = json.folder;
    }

    public static exists(scriptPath: string): boolean {
        let path = PipelineConfig.pathFromScript(scriptPath);
        return fs.existsSync(path);
    }

    public static pathFromScript(scriptPath: string): string {
        let parsed = path.parse(scriptPath);
        let configFileName = `.${parsed.name}.config.json`;
        return path.join(parsed.dir, configFileName);
    }
}