import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { readyaml, readjson, writejson, writeyaml } from './utils';

const GLOBAL_CONFIG = '.jenkins-jack.config.yaml'
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
            if (overwrite) this.save();
            return;
        }

        if (this.path.split('.').pop() === "json") {
            let json = readjson(this.path);
            this.name = json.name;
            this.params = json.params;
            this.interactiveInputOverride = json.interactiveInputOverride;
            this.folder = json.folder;
        } else if (this.path.split('.').pop() === "yaml") {
            let yaml = readyaml(this.path);
            this.name = yaml.name;
            this.params = yaml.params;
            this.interactiveInputOverride = yaml.interactiveInputOverride;
            this.folder = yaml.folder;
        }
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
        let relativePathFromCurrentToWorkspace: string;
        let folderPath = this.currentFolderPath;
        let configPath: string;
        let validateJackConfig: boolean | false = false;
        let yaml: any | undefined;

        console.log('currentFolderPath: ', this.currentFolderPath);
        if (vscode.workspace.workspaceFolders?.length === 1) {
            // Get relative path from current directory to workspace directory
            relativePathFromCurrentToWorkspace = path.relative(this.currentFolderPath,vscode.workspace.workspaceFolders[0].uri.path)
            configPath = path.join(folderPath, GLOBAL_CONFIG)

            if (fs.existsSync(configPath)) {
                yaml = readyaml(configPath);
                validateJackConfig = this.validateConfigure(yaml);
            } 
            if (!validateJackConfig) {
                for (let index in relativePathFromCurrentToWorkspace.split(path.sep)) {
                    folderPath = path.normalize(path.join(folderPath, relativePathFromCurrentToWorkspace.split(path.sep)[index]));
                    configPath = path.join(folderPath, GLOBAL_CONFIG)
                    if (fs.existsSync(configPath)) {
                        yaml = readyaml(configPath);
                        validateJackConfig = this.validateConfigure(yaml);
                        if (validateJackConfig) break;
                        else yaml = undefined;
                    }
                }
            }
        }
        
        if (undefined === this.folder || '' === this.folder) {
            this.folder = this.currentFolderPath.replace(folderPath, "");
            this.folder = this.folder.replace(/^\//,'');
        }

        if (validateJackConfig) {
            return path.join(yaml.job.prefix, this.folder, this.name);
        }
        return path.join(this.folder, this.name);
        
    }

    validateConfigure(yaml: any): boolean {
        if (yaml) {
            //hardcode check yaml job.prefix
            if ('string' === typeof(yaml.job.prefix)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Saves the current pipeline configuration to disk.
     */
    public save() {
        if (this.path.split('.').pop() === "json") writejson(this.path, this);
        else writeyaml(this.path, this);
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
        let configFileNameYaml = `.${parsed.name}.config.yaml`;
        if (fs.existsSync(path.join(parsed.dir, configFileName))) return path.join(parsed.dir, configFileName);
        return path.join(parsed.dir, configFileNameYaml);
    }
}