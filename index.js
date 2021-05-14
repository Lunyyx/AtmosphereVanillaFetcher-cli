const fetch = require('node-fetch');
const fs = require('fs-extra')
const Downloader = require('nodejs-file-downloader');
const StreamZip = require('node-stream-zip');
const cliProgress = require('cli-progress');
const chalk = require('chalk');
const {PythonShell} = require('python-shell');
var AdmZip = require('adm-zip');
require('dotenv').config();

const output_folder = './temp';
const final_folder = './SD';

console.log('Bienvenue sur AtmosphereVanillaFetcher.\nDéveloppé par Lunyx, avec la grande aide de Murasaki.\nRemerciements:\nZoria pour le script original.\nMurasaki pour l\'immense aide qu\'il a fourni pour ce projet.\n')

if(!fs.existsSync(output_folder)) {
    fs.mkdir(output_folder, function () {
        console.log('Dossier "temp" créé !');
    })
}

if(!fs.existsSync(final_folder)) {
    fs.mkdir(final_folder, function () {
        console.log('Dossier "SD" créé !');
    })
}

(async () => {
    async function getRelease(link, desiredNumbers, desiredNames) {
        let nameIndex = 0;
        let release = await fetch(`https://api.github.com/repos/${link}/releases`, {
            headers: {
                Authorization: `token ${process.env.GITHUB_TOKEN}`
            }
        });

        if (release.status === 404)
            return console.log(`https://api.github.com/repos/${link}/releases retourne une erreur 404.`);
        else if (release.headers['x-ratelimit-limit'] === 60) 
            return console.log('Bad Key');
        else if (release.headers['x-ratelimit-remaining'] === 0) 
            return console.log('Rate Limit');

        release = await release.json();
        release = release[0];

        let repoName = release.url.replace('https://api.github.com/repos', '').replace(`/releases/${release.id}`, '').split('/')[2];

        const { assets } = release;
        if (assets.length === 0)
            return console.log(`Il n'y a pas de fichiers sur la dernière version de ${repoName}.`);

        const desiredFiles = [];
        
        for (let number of desiredNumbers) {
            number--;
            if (assets[number]) {
                desiredFiles.push({
                    name: desiredNames[nameIndex],
                    url: assets[number].browser_download_url
                });
            };
            nameIndex++;
        };

        return desiredFiles;
    };
    
    const desiredReleases = [{ link: 'CTCaer/hekate', desiredNumbers: [1], desiredNames: ['hekate.zip'] }, { link: 'Atmosphere-NX/Atmosphere', desiredNumbers: [2, 3], desiredNames: ['atmosphere.zip', 'fusee_primary.bin'] }, { link: 'ITotalJustice/patches', desiredNumbers: [1], desiredNames: ['fusee.zip'] }, { link: 'Huntereb/Awoo-Installer', desiredNumbers: [1], desiredNames: ['awoo_installer.zip'] }, ];
    
    let files = [];

    for (let desiredRelease of desiredReleases) {
        const { link, desiredNumbers, desiredNames } = desiredRelease;
        let release = await getRelease(link, desiredNumbers, desiredNames);
        files = files.concat(release);
    };

    files.push({
        name: 'sxgear.zip',
        url: 'https://sx.xecuter.com/download/SX_Gear_v1.1.zip'
    });

    files.push({
        name: 'hekate_ipl.ini',
        url: 'https://nobuyoshi.red/hekate_ipl.ini'
    });

    files.push({
        name: 'exosphere.ini',
        url: 'https://nobuyoshi.red/exosphere.ini'
    });

    files.push({
        name: 'sysmmc.txt',
        url: 'https://nobuyoshi.red/sysmmc.txt'
    });

    files.push({
        name: 'emummc.txt',
        url: 'https://nobuyoshi.red/emummc.txt'
    });

    console.log('Téléchargement des différents fichiers nécessaires au pack:');
    const filesLength = files.length;
    let downloadedFiles = 0;
    
    for (let file of files) {
        const { name, url } = file;
        let bar;
        
        let downloader = new Downloader({
            url: url,
            directory: output_folder,
            filename: name,
            cloneFiles: false,
            onBeforeSave:()=>{
                console.log(`\nDébut du téléchargement de: ${name}`);
                bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                bar.start(100, 0);
            },   
            onProgress: async function(percentage){
                await bar.update(Math.round(percentage));
            },        
        });
        
        try {
            await downloader.download();
            bar.stop();
            console.log(chalk.green(`Le fichier ${chalk.bold(name)} a été téléchargé avec succès.`));
            downloadedFiles++;
        } catch (error) {
            if (bar)
                bar.stop();
            console.log(chalk.red(`Le fichier ${chalk.bold(name)} n'a pas pu être téléchargé:\n${error}`));
        };
    };

    if (downloadedFiles === 0)
        console.log(chalk.bold.red(`\nAucun fichier n\'a été téléchargé.`));
    else if (downloadedFiles === filesLength)
        console.log(chalk.bold.green(`\nTous les fichiers ont été téléchargés.`));
    else
        console.log(chalk.bold.keyword('orange')(`\n${downloadedFiles}/${filesLength} fichiers ont été téléchargés.`));

    console.log('\nPréparation du dossier "SD"...');

    let temp_files = fs.readdirSync(output_folder);
    let zip_temp_files = temp_files.filter(f => f.endsWith('.zip'));
    let other_files = temp_files.filter(f => !f.endsWith('.zip'));
    
    for (let zip of zip_temp_files) {
        const zip_file = new StreamZip.async({ file: `./temp/${zip}` });

        if(!fs.existsSync(`./temp/${zip.replace('.zip', '')}`))
            fs.mkdirSync(`./temp/${zip.replace('.zip', '')}`);
        else {
            fs.rmSync(`./temp/${zip.replace('.zip', '')}`, { recursive: true });
            fs.mkdirSync(`./temp/${zip.replace('.zip', '')}`);
        };

        const count = await zip_file.extract(null, `./temp/${zip.replace('.zip', '')}`);
        
        console.log(`${chalk.bold(count)} fichier(s) extrait(s) de ${chalk.bold(zip)}`);
    };

    console.log('\nGénération du boot.dat modifié...')
    fs.rename('./temp/hekate/hekate_ctcaer_5.5.6.bin', './temp/hekate/hekate_ctcaer.bin', () => {
        console.log('Fichier hekate renommé en "hekate_ctcaer.bin".');
    })

    await PythonShell.run('./python/tx_custom_boot.py', null, function (err) {
        if (err) throw chalk.red(err);
        console.log(chalk.bold.green('\nFichier "boot.dat" généré avec succès dans ./SD/ !'));
    })

    fs.copy('./temp/atmosphere/', './SD/').then(() => {
        console.log(chalk.green(`\nContenu du dossier ${chalk.bold("./temp/atmosphere/")} copié dans ${chalk.bold("./SD/")}.`));
        
        fs.copy('./temp/hekate/bootloader/', './SD/bootloader/').then(() => {
            console.log(chalk.green(`Contenu du dossier ${chalk.bold("./temp/hekate/bootloader/")} copié dans ${chalk.bold("./SD/bootloader/")}.`));
            
            fs.copy('./temp/fusee/atmosphere/', './SD/atmosphere/').then(() => {
                console.log(chalk.green(`Contenu du dossier ${chalk.bold("./temp/fusee/atmosphere/")} copié dans ${chalk.bold("./SD/atmosphere/")}.`));
                
                fs.copy('./temp/awoo_installer/switch/', './SD/switch/').then(() => {
                    console.log(chalk.green(`Contenu du dossier ${chalk.bold("./temp/awoo_installer/switch/")} copié dans ${chalk.bold("./SD/switch/")}.`));
                    
                    fs.copy('./temp/fusee_primary.bin', './SD/bootloader/payloads/fusee-primary.bin').then(() => {
                        console.log(chalk.green(`Fichier ${chalk.bold("./temp/fusee_primary.bin")} copié dans ${chalk.bold("./SD/bootloader/payloads/fusee-primary.bin")}.`));
                        
                        fs.copy('./temp/hekate/hekate_ctcaer.bin', './SD/payload.bin').then(() => {
                            console.log(chalk.green(`Fichier ${chalk.bold("./temp/hekate/hekate_ctcaer.bin")} copié dans ${chalk.bold("./SD/payload.bin")}.`));
                            
                            fs.copy('./temp/hekate/hekate_ctcaer.bin', './SD/atmosphere/reboot_payload.bin').then(() => {
                                console.log(chalk.green(`Fichier ${chalk.bold("./temp/hekate/hekate_ctcaer.bin")} copié dans ${chalk.bold("./SD/atmosphere/reboot_payload.bin")}.`));
                                
                                fs.copy('./temp/hekate_ipl.ini', './SD/bootloader/hekate_ipl.ini').then(() => {
                                    console.log(chalk.green(`Fichier ${chalk.bold("./temp/hekate_ipl.ini")} copié dans ${chalk.bold("./SD/bootloader/hekate_ipl.ini")}.`));
                                    
                                    fs.copy('./temp/exosphere.ini', './SD/exosphere.ini').then(() => {
                                        console.log(chalk.green(`Fichier ${chalk.bold("./temp/exosphere.ini")} copié dans ${chalk.bold("./SD/exosphere.ini")}.`));
                                        
                                        if(!fs.existsSync('./SD/atmosphere/hosts')) {
                                            fs.mkdirSync('./SD/atmosphere/hosts')
                                        }

                                        console.log(chalk.green(`Dossier ${chalk.bold("./SD/atmosphere/hosts")} créé.`));

                                        fs.copy('./temp/sysmmc.txt', './SD/atmosphere/hosts/sysmmc.txt').then(() => {
                                            console.log(chalk.green(`Fichier ${chalk.bold("./temp/sysmmc.txt")} copié dans ${chalk.bold("./SD/atmosphere/hosts/sysmmc.txt")}.`));
                                            
                                            fs.copy('./temp/emummc.txt', './SD/atmosphere/hosts/emummc.txt').then(() => {
                                                console.log(chalk.green(`Fichier ${chalk.bold("./temp/emummc.txt")} copié dans ${chalk.bold("./SD/atmosphere/hosts/emummc.txt")}.`));
                                                
                                                /*var zip = new AdmZip();

                                                zip.addLocalFolder('./SD/')
                                                zip.writeZip('./pack.zip');*/
                                            }).catch((error) => {
                                                console.log(chalk.red(error));
                                            });
                                        }).catch((error) => {
                                            console.log(chalk.red(error));
                                        });
                                    }).catch((error) => {
                                        console.log(chalk.red(error));
                                    });
                                }).catch((error) => {
                                    console.log(chalk.red(error));
                                });
                            }).catch((error) => {
                                console.log(chalk.red(error));
                            });
                        }).catch((error) => {
                            console.log(chalk.red(error));
                        });
                    }).catch((error) => {
                        console.log(chalk.red(error));
                    });
                }).catch((error) => {
                    console.log(chalk.red(error));
                });
            }).catch((error) => {
                console.log(chalk.red(error));
            });
        }).catch((error) => {
            console.log(chalk.red(error));
        });
    }).catch((error) => {
        console.log(chalk.red(error));
    });
})();
