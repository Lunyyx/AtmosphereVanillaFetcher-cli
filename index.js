const fetch = require('node-fetch');
const fs = require('fs-extra')
const Downloader = require('nodejs-file-downloader');
const cliProgress = require('cli-progress');
const chalk = require('chalk');
const { PythonShell } = require('python-shell');
const moment = require('moment');
const qoa = require('qoa');
const ZIP = require('zip-lib');
require('dotenv').config();
moment.locale('fr');

const colors = {
    'default': (text) => { return chalk.hex('#2C3579')(text); },
    'success': (text) => { return chalk.hex('#076A00')(text); },
    'warning': (text) => { return chalk.hex('#FF7400')(text) },
    'error':(text) => { return chalk.hex('#BC0101')(text); },
};

async function checkKey(key) {
    try {
        await new Promise(resolve => setTimeout(resolve, 3000));
        const test = await fetch('https://api.github.com/', { headers: { Authorization : `token ${key}` } });
        if (test.headers.get('x-ratelimit-limit') == 60)
            return false;
        return true;
    } catch(e) {
        console.log(colors.error(`[CheckKey] Une erreur est survenue: ${e}`));
        process.exit();
    }
};

(async () => {
    console.clear();
    console.log(colors.default(`
  ___  _                             _          ✢         _   _             _ _ _      ______   _       _               ✢
 / _ \\| |             ✢             | |                  | | | |           (_) | |     |  ___| | |     | |              
/ /_\\ \\ |_ _ __ ___   ___  ___ _ __ | |__   ___ _ __ ___ | | | | __ _ _ __  _| | | __ _| |_ ___| |_ ___| |__   ___ _ __ 
|  _  | __| '_ \` _ \\ / _ \\/ __| '_ \\| '_ \\ / _ \\ '__/ _ \\| | | |/ _\` | '_ \\| | | |/ _\` |  _/ _ \\ __/ __| '_ \\ / _ \\ '__|
| | | | |_| | | | | | (_) \\__ \\ |_) | | | |  __/ | |  __/\\ \\_/ / (_| | | | | | | | (_| | ||  __/ || (__| | | |  __/ |   
\\_| |_/\\__|_| |_| |_|\\___/|___/ .__/|_| |_|\\___|_|  \\___| \\___/ \\__,_|_| |_|_|_|_|\\__,_\\_| \\___|\\__\\___|_| |_|\\___|_|   
                              | |                                                                                       
                              |_|      ✢                     ✢                        v1.0.0 By Lunyx, Zoria & Murasaki.    ✢                                                               
`));

    let GITHUB_TOKEN = '';
    
    if (process.env.GITHUB_TOKEN)
        GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    else if (fs.existsSync('./key.txt'))
        GITHUB_TOKEN = await fs.readFile('./key.txt');
    if (GITHUB_TOKEN == '') {
        console.log(colors.warning('Aucune clé d\'accès à l\'API de GitHub n\'a été trouvée.'));    
        do {
            GITHUB_TOKEN = await qoa.input({ query: colors.warning('Veuillez indiquer votre clé d\'accès API GitHub:'), handle: 'key' }).then(a => { return a.key; });
            if (GITHUB_TOKEN == '') {
                console.log(colors.error('Vous n\'avez indiqué aucune clé.'));
                continue;
            };
            console.log(colors.warning('Vérification de votre clé en cours...'));
            if (await checkKey(GITHUB_TOKEN)) {
                console.log(colors.success('La clé indiquée est valide, elle va être sauvegardée dans le fichier .env.'));
                await fs.writeFile('./.env', `GITHUB_TOKEN=${GITHUB_TOKEN}`);
                console.log(colors.success('La clé a bien été sauvegardée dans le fichier .env.'));
            } else {
                console.log(colors.error('La clé indiquée est invalide, veuillez en spécifier une de correcte.'));
                GITHUB_TOKEN = '';
            };
        } while(GITHUB_TOKEN == '');
    };

    const output_folder = './temp';
    const final_folder = './SD';
    let hekate_version = '';

    if(!fs.existsSync(output_folder)) {
        await fs.mkdir(output_folder);
        console.log(colors.warning('Dossier temporaire (temp) créé.'));
    };
    
    if(!fs.existsSync(final_folder)) {
        await fs.mkdir(final_folder);
        console.log(colors.warning('Dossier contenant ce qui va être utilisé pour créer le pack (SD) créé.'));
    };

    async function getRelease(link, desiredFiles) {
        try {
            let release = await fetch(`https://api.github.com/repos/${link}/releases`, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
    
            if (release.status === 404) {
                console.log(colors.error(`https://api.github.com/repos/${link}/releases retourne une erreur 404.`));
                process.exit();
            } else if (release.headers.get('x-ratelimit-limit') == 60) {
                console.log(colors.error('La clé d\'accès à l\'API de GitHub est erronnée, vous allez devoir recommencer une configuration.'));
                if (fs.existsSync('./.env'))
                    await fs.unlink('./.env');
                if (fs.existsSync('./key.txt'))
                    await fs.unlink('./key.txt');
                process.exit();
            } else if (release.headers.get('x-ratelimit-remaining') == 0) {
                console.log(colors.error(`Vous avez dépassé le nombre de requêtes maximum par heure, vous devez attendre ${colors.default(moment(Number(release.headers.get('x-ratelimit-reset')) * 1000).format('ddd LL, LTS'))} avant de pouvoir réutiliser le programme.`));
                process.exit();
            };
    
            release = await release.json();
            release = release[0];
    
            let repoName = release.url.replace('https://api.github.com/repos', '').replace(`/releases/${release.id}`, '').split('/')[2];
    
            const { assets } = release;
            if (assets.length === 0) {
                console.log(colors.error(`Il n'y a pas de fichiers sur la dernière version de ${repoName}.`));
                process.exit();
            };
    
            const desiredFilesArray = [];
    
            for (let asset of assets) {
                const { name, browser_download_url } = asset;
                for (let file of desiredFiles) {
                    const { exp, filename } = file;
                    if (exp.test(name) && name.replace(name.match(exp)[0], '') == '') {
                        desiredFilesArray.push({ name: filename, url: browser_download_url, version: release.tag_name });
                        break;
                    };
                };
            };

            console.log(colors.success(`${colors.default(`${repoName} (${release.tag_name})`)} récupéré.`));
    
            return desiredFilesArray;
        } catch (e) {
            console.log(colors.error(`[GetRelease] Une erreur est survenue: ${e}`));
            process.exit();
        };
    };

    const desiredReleases = 
        [{ 
            link: 'CTCaer/hekate', desiredFiles: [{ 
                exp: /^hekate_ctcaer_[0-9]*\.[0-9]+[0-9]*\.[0-9]+_[a-zA-Z]+_[0-9]*\.[0-9]+[0-9]*\.[0-9]+\.zip$/, filename: 'hekate.zip' 
            }]
        }, 
        {
            link: 'Atmosphere-NX/Atmosphere', desiredFiles: [{ 
                exp: /^atmosphere-(\d(\.\d)+)(\d(\.\d)+)-[a-zA-Z]+-[0-9]+a[0-9]+d-WITHOUT_MESOSPHERE\+hbl-[0-9]*\.[0-9]+[0-9]*\.[0-9]+\+hbmenu-[0-9]*\.[0-9]+[0-9]*\.[0-9]+\.zip$/, filename: 'atmosphere.zip' 
            }, 
            { 
                exp: /^fusee-primary\.bin$/, filename: 'fusee_primary.bin' 
            }] 
        }, 
        { 
            link: 'ITotalJustice/patches', desiredFiles: [{ 
                exp: /^fusee\.zip$/, filename: 'fusee.zip' 
            }] 
        }, 
        { 
            link: 'Huntereb/Awoo-Installer', desiredFiles: [{ 
                exp: /^Awoo-Installer\.zip$/, filename: 'awoo_installer.zip' 
            }] 
        }, 
        { 
            link: 'WerWolv/EdiZon', desiredFiles: [{ 
                exp: /^EdiZon\.nro$/, filename: 'EdiZon.nro' 
            }] 
        }, 
        { 
            link: 'XorTroll/Goldleaf', desiredFiles: [{ 
                exp: /^Goldleaf\.nro$/, filename: 'Goldleaf.nro' 
            }] 
        }, 
        { 
            link: 'SciresM/Checkpoint', desiredFiles: [{ 
                exp: /^Checkpoint\.nro$/, filename: 'Checkpoint.nro' 
            }] 
        }, 
        { 
            link: 'J-D-K/JKSV', desiredFiles: [{ 
                exp: /^JKSV\.nro$/, filename: 'JKSV.nro' 
            }] 
        }, 
        { 
            link: 'mtheall/ftpd', desiredFiles: [{ 
                exp: /^ftpd\.nro$/, filename: 'ftpd.nro' 
            }] 
        }, 
        { 
            link: 'liuervehc/nxmtp', desiredFiles: [{ 
                exp: /^nxmtp\.nro$/, filename: 'nxmtp.nro' 
            }] 
        }, 
        { 
            link: 'mrdude2478/TinWoo', desiredFiles: [{ 
                exp: /^TinWoo-Installer\.zip$/, filename: 'TinWoo-Installer.zip' 
            }] 
        },
         
          { 
            link: 'PoloNX/sigpatch-downloader', desiredFiles: [{ 
                exp: /^sigpatch-downloader\.nro$/, filename: 'sigpatch-downloader.nro' 
            }] 
        }, 
         
        { 
            link: 'meganukebmp/Switch_90DNS_tester', desiredFiles: [{ 
                exp: /^Switch_90DNS_tester\.nro$/, filename: 'Switch_90DNS_tester.nro' 
            }] 
        }],

    let files = [];

    console.log(colors.warning('Récupération de la dernière version des dépôts GitHub en cours...\n'));

    for (let desiredRelease of desiredReleases) {
        const { link, desiredFiles } = desiredRelease;
        let release = await getRelease(link, desiredFiles);
        files = files.concat(release);
    };

    files.push({ name: 'sxgear.zip', url: 'https://sx.xecuter.com/download/SX_Gear_v1.1.zip', version: 'v1.1' }, { name: 'tinfoil.zip', url: 'https://tinfoil.io/Home/Bounce/?url=https%3A%2F%2Ftinfoil.media%2Frepo%2Ftinfoil.latest.zip', version: 'v12.0' }, { name: 'hekate_ipl.ini', url: 'https://nobuyoshi.red/hekate_ipl.ini', version: 'latest' }, { name: 'exosphere.ini', url: 'https://nobuyoshi.red/exosphere.ini', version: 'latest' }, { name: 'sysmmc.txt', url: 'https://nobuyoshi.red/sysmmc.txt', version: 'latest' }, { name: 'emummc.txt', url: 'https://nobuyoshi.red/emummc.txt', version: 'latest'}, { name: 'version.txt', url: 'https://sighya.ga/version.txt', version: '1.0.7' });

    console.log(colors.warning('\nLes fichiers nécessaires à la création du pack sont en cours de téléchargement...'));

    for (let file of files) {
        const { name, url, version } = file;
        let bar;

        if (name == 'hekate.zip')
            hekate_version = version.replace('v', '');
        
        let downloader = new Downloader({ url: url, directory: output_folder, filename: name, cloneFiles: false,
            onBeforeSave: () => {
                console.log(colors.warning(`\nLe fichier ${name} (${version}) est en cours de téléchargement...`));
                bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                bar.start(100, 0);
            },   
            onProgress: async function(percentage){
                await bar.update(Math.round(percentage));
            }        
        });
        
        try {
            await downloader.download();
            bar.stop();
            console.log(colors.success(`Le fichier ${colors.default(name)} a été téléchargé avec succès.`));
        } catch (e) {
            if (bar)
                bar.stop();
            console.log(colors.error(`Le fichier ${colors.default(name)} n'a pas pu être téléchargé. ${e}`));
            process.exit();
        };
    };

    console.log(colors.success('\nTous les fichiers nécessaires ont été téléchargés.'), colors.warning('\nPréparation du dossier SD...\n'));
    let zip_temp_files = await fs.readdir(output_folder).then(files => { return files.filter(f => f.endsWith('.zip')) });

    for (let zip of zip_temp_files) {
        if(!fs.existsSync(`./temp/${zip.replace('.zip', '')}`))
            await fs.mkdir(`./temp/${zip.replace('.zip', '')}`);
        else {
            await fs.rm(`./temp/${zip.replace('.zip', '')}`, { recursive: true });
            await fs.mkdir(`./temp/${zip.replace('.zip', '')}`);
        };
        await ZIP.extract(`./temp/${zip}`, `./temp/${zip.replace('.zip', '')}`);
        console.log(colors.success(`Le fichier ${colors.default(zip)} a été extrait avec succès.`));
    };

    console.log(colors.warning('\nCréation du fichier boot.dat contenant hekate...'));

    fs.rename(`./temp/hekate/hekate_ctcaer_${hekate_version}.bin`, './temp/hekate/hekate_ctcaer.bin', () => {
        console.log(colors.warning(`Le fichier ${colors.default(`hekate_ctcaer_${hekate_version}.bin`)} a été renommé en ${colors.default('hekate_ctcaer.bin')}.`));
    });

    PythonShell.run('./python/tx_custom_boot.py', null, function (e) {
        if (e) {
            console.log(colors.error(`[Boot.dat] Une erreur est survenue: ${e}`));
        };
        console.log(colors.success(`Le fichier ${colors.default('boot.dat')} a été correctement créé.`));
    });

    try {
        await fs.copy('./temp/atmosphere/', './SD/');
        console.log(colors.success(`\nLe contenu du dossier ${colors.default('temp/atmosphere')} a été copié vers le dossier ${colors.default('SD')}.`));
        await fs.copy('./temp/hekate/bootloader/', './SD/bootloader/');
        console.log(colors.success(`Le contenu du dossier ${colors.default('temp/hekate/bootloader')} a été copié vers le dossier ${colors.default('SD/bootloader')}.`));
        await fs.copy('./temp/fusee/atmosphere/', './SD/atmosphere/');
        console.log(colors.success(`Le contenu du dossier ${colors.default('temp/fusee/atmosphere')} a été copié vers le dossier ${colors.default('SD/atmosphere')}.`));
        await fs.copy('./temp/awoo_installer/switch/', './SD/switch/');
        console.log(colors.success(`Le contenu du dossier ${colors.default('temp/awoo_installer/switch')} a été copié vers le dossier ${colors.default('SD/switch')}.`));
        await fs.copy('./temp/fusee_primary.bin', './SD/bootloader/payloads/fusee-primary.bin');
        console.log(colors.success(`Le fichier ${colors.default('temp/fusee_primary.bin')} a été copié vers le dossier ${colors.default('SD/bootloader/payloads')}`));
        await fs.copy('./temp/hekate/hekate_ctcaer.bin', './SD/payload.bin');
        console.log(colors.success(`Le fichier ${colors.default('temp/hekate/hekate_ctcaer.bin')} a été copié vers le dossier ${colors.default('SD (payload.bin)')}.`));
        await fs.copy('./temp/hekate/hekate_ctcaer.bin', './SD/atmosphere/reboot_payload.bin');
        console.log(colors.success(`Le fichier ${colors.default('temp/hekate/hekate_ctcaer.bin')} a été copié vers le dossier ${colors.default('SD/atmosphere (reboot_payload.bin)')}.`));
        await fs.copy('./temp/hekate_ipl.ini', './SD/bootloader/hekate_ipl.ini');
        console.log(colors.success(`Le fichier ${colors.default('temp/hekate_ipl.ini')} a été copié vers le dossier ${colors.default('SD/bootloader')}.`));
        await fs.copy('./temp/exosphere.ini', './SD/exosphere.ini');
        console.log(colors.success(`Le fichier ${colors.default('temp/exosphere.ini')} a été copié vers le dossier ${colors.default('SD')}.`));
        await fs.copy('./temp/version.txt', './SD/version.txt');
        console.log(colors.success(`Le fichier ${colors.default('temp/version.txt')} a été copié vers le dossier ${colors.default('SD')}.`));

        if (!fs.existsSync('./SD/atmosphere/hosts')) {
            await fs.mkdir('./SD/atmosphere/hosts');
            console.log(colors.success(`Le dossier ${colors.default('hosts')} a été créé dans ${colors.default('SD/atmosphere')}.`));
        };

        await fs.copy('./temp/sysmmc.txt', './SD/atmosphere/hosts/sysmmc.txt');
        console.log(colors.success(`Le fichier ${colors.default('temp/sysmmc.txt')} a été copié vers le dossier ${colors.default('SD/atmosphere/hosts')}.`));
        await fs.copy('./temp/emummc.txt', './SD/atmosphere/hosts/emummc.txt');
        console.log(colors.success(`Le fichier ${colors.default('temp/emummc.txt')} a été copié vers le dossier ${colors.default('SD/atmosphere/hosts')}.`));
        await fs.copy('./temp/TinWoo-Installer/', './SD/');
        console.log(colors.success(`Le contenu du dossier ${colors.default('temp/TinWoo-Installer')} a été copié vers le dossier ${colors.default('SD')}.`));
        await fs.copy('./temp/tinfoil/', './SD/');
        console.log(colors.success(`Le contenu du dossier ${colors.default('temp/tinfoil')} a été copié vers le dossier ${colors.default('SD')}.`));

        let homebrews = await fs.readdir(output_folder).then(files => { return files.filter(f => f.endsWith('nro')) });
        
        for (let homebrew of homebrews) {
            await fs.copy(`./temp/${homebrew}`, `./SD/switch/${homebrew}`);
            console.log(colors.success(`Le contenu du dossier ${colors.default(`temp/${homebrew}`)} a été copié vers le dossier ${colors.default('SD/switch')}.`));
        };

        console.log(colors.success('\nLe pack est en cours de création...\n'));
        await ZIP.archiveFolder('./SD', './pack.zip');

        console.log(colors.success('Voici le contenu du pack:'));
        for (let file of files) {
            const { name, version } = file;
            console.log(colors.default(`${name} (${version})`));
        };

        await fs.emptyDir('./temp/', { recursive: true });
        console.log(colors.warning(`\nLe contenu du dossier ${colors.default('temp')} a été supprimé.`), colors.success(`\nLe pack a été créé avec succès ${colors.default('(pack.zip)')}.`));
    } catch (e) {
        console.log(colors.error(`[Copie et création du pack.zip] Une erreur est survenue: ${e}`));
    };
})();const fetch = require('node-fetch');
const fs = require('fs-extra')
const Downloader = require('nodejs-file-downloader');
const cliProgress = require('cli-progress');
const chalk = require('chalk');
const { PythonShell } = require('python-shell');
const moment = require('moment');
const qoa = require('qoa');
const ZIP = require('zip-lib');
require('dotenv').config();
moment.locale('fr');

const colors = {
    'default': (text) => { return chalk.hex('#2C3579')(text); },
    'success': (text) => { return chalk.hex('#076A00')(text); },
    'warning': (text) => { return chalk.hex('#FF7400')(text) },
    'error':(text) => { return chalk.hex('#BC0101')(text); },
};

async function checkKey(key) {
    try {
        await new Promise(resolve => setTimeout(resolve, 3000));
        const test = await fetch('https://api.github.com/', { headers: { Authorization : `token ${key}` } });
        if (test.headers.get('x-ratelimit-limit') == 60)
            return false;
        return true;
    } catch(e) {
        console.log(colors.error(`[CheckKey] Une erreur est survenue: ${e}`));
        process.exit();
    }
};

(async () => {
    console.clear();
    console.log(colors.default(`
  ___  _                             _          ✢         _   _             _ _ _      ______   _       _               ✢
 / _ \\| |             ✢             | |                  | | | |           (_) | |     |  ___| | |     | |              
/ /_\\ \\ |_ _ __ ___   ___  ___ _ __ | |__   ___ _ __ ___ | | | | __ _ _ __  _| | | __ _| |_ ___| |_ ___| |__   ___ _ __ 
|  _  | __| '_ \` _ \\ / _ \\/ __| '_ \\| '_ \\ / _ \\ '__/ _ \\| | | |/ _\` | '_ \\| | | |/ _\` |  _/ _ \\ __/ __| '_ \\ / _ \\ '__|
| | | | |_| | | | | | (_) \\__ \\ |_) | | | |  __/ | |  __/\\ \\_/ / (_| | | | | | | | (_| | ||  __/ || (__| | | |  __/ |   
\\_| |_/\\__|_| |_| |_|\\___/|___/ .__/|_| |_|\\___|_|  \\___| \\___/ \\__,_|_| |_|_|_|_|\\__,_\\_| \\___|\\__\\___|_| |_|\\___|_|   
                              | |                                                                                       
                              |_|      ✢                     ✢                        v1.0.0 By Lunyx, Zoria & Murasaki.    ✢                                                               
`));

    let GITHUB_TOKEN = '';
    
    if (process.env.GITHUB_TOKEN)
        GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    else if (fs.existsSync('./key.txt'))
        GITHUB_TOKEN = await fs.readFile('./key.txt');
    if (GITHUB_TOKEN == '') {
        console.log(colors.warning('Aucune clé d\'accès à l\'API de GitHub n\'a été trouvée.'));    
        do {
            GITHUB_TOKEN = await qoa.input({ query: colors.warning('Veuillez indiquer votre clé d\'accès API GitHub:'), handle: 'key' }).then(a => { return a.key; });
            if (GITHUB_TOKEN == '') {
                console.log(colors.error('Vous n\'avez indiqué aucune clé.'));
                continue;
            };
            console.log(colors.warning('Vérification de votre clé en cours...'));
            if (await checkKey(GITHUB_TOKEN)) {
                console.log(colors.success('La clé indiquée est valide, elle va être sauvegardée dans le fichier .env.'));
                await fs.writeFile('./.env', `GITHUB_TOKEN=${GITHUB_TOKEN}`);
                console.log(colors.success('La clé a bien été sauvegardée dans le fichier .env.'));
            } else {
                console.log(colors.error('La clé indiquée est invalide, veuillez en spécifier une de correcte.'));
                GITHUB_TOKEN = '';
            };
        } while(GITHUB_TOKEN == '');
    };

    const output_folder = './temp';
    const final_folder = './SD';
    let hekate_version = '';

    if(!fs.existsSync(output_folder)) {
        await fs.mkdir(output_folder);
        console.log(colors.warning('Dossier temporaire (temp) créé.'));
    };
    
    if(!fs.existsSync(final_folder)) {
        await fs.mkdir(final_folder);
        console.log(colors.warning('Dossier contenant ce qui va être utilisé pour créer le pack (SD) créé.'));
    };

    async function getRelease(link, desiredFiles) {
        try {
            let release = await fetch(`https://api.github.com/repos/${link}/releases`, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
    
            if (release.status === 404) {
                console.log(colors.error(`https://api.github.com/repos/${link}/releases retourne une erreur 404.`));
                process.exit();
            } else if (release.headers.get('x-ratelimit-limit') == 60) {
                console.log(colors.error('La clé d\'accès à l\'API de GitHub est erronnée, vous allez devoir recommencer une configuration.'));
                if (fs.existsSync('./.env'))
                    await fs.unlink('./.env');
                if (fs.existsSync('./key.txt'))
                    await fs.unlink('./key.txt');
                process.exit();
            } else if (release.headers.get('x-ratelimit-remaining') == 0) {
                console.log(colors.error(`Vous avez dépassé le nombre de requêtes maximum par heure, vous devez attendre ${colors.default(moment(Number(release.headers.get('x-ratelimit-reset')) * 1000).format('ddd LL, LTS'))} avant de pouvoir réutiliser le programme.`));
                process.exit();
            };
    
            release = await release.json();
            release = release[0];
    
            let repoName = release.url.replace('https://api.github.com/repos', '').replace(`/releases/${release.id}`, '').split('/')[2];
    
            const { assets } = release;
            if (assets.length === 0) {
                console.log(colors.error(`Il n'y a pas de fichiers sur la dernière version de ${repoName}.`));
                process.exit();
            };
    
            const desiredFilesArray = [];
    
            for (let asset of assets) {
                const { name, browser_download_url } = asset;
                for (let file of desiredFiles) {
                    const { exp, filename } = file;
                    if (exp.test(name) && name.replace(name.match(exp)[0], '') == '') {
                        desiredFilesArray.push({ name: filename, url: browser_download_url, version: release.tag_name });
                        break;
                    };
                };
            };

            console.log(colors.success(`${colors.default(`${repoName} (${release.tag_name})`)} récupéré.`));
    
            return desiredFilesArray;
        } catch (e) {
            console.log(colors.error(`[GetRelease] Une erreur est survenue: ${e}`));
            process.exit();
        };
    };

    const desiredReleases = 
        [{ 
            link: 'CTCaer/hekate', desiredFiles: [{ 
                exp: /^hekate_ctcaer_[0-9]*\.[0-9]+[0-9]*\.[0-9]+_[a-zA-Z]+_[0-9]*\.[0-9]+[0-9]*\.[0-9]+\.zip$/, filename: 'hekate.zip' 
            }]
        }, 
        {
            link: 'Atmosphere-NX/Atmosphere', desiredFiles: [{ 
                exp: /^atmosphere-(\d(\.\d)+)(\d(\.\d)+)-[a-zA-Z]+-[0-9]+a[0-9]+d-WITHOUT_MESOSPHERE\+hbl-[0-9]*\.[0-9]+[0-9]*\.[0-9]+\+hbmenu-[0-9]*\.[0-9]+[0-9]*\.[0-9]+\.zip$/, filename: 'atmosphere.zip' 
            }, 
            { 
                exp: /^fusee-primary\.bin$/, filename: 'fusee_primary.bin' 
            }] 
        }, 
        { 
            link: 'ITotalJustice/patches', desiredFiles: [{ 
                exp: /^fusee\.zip$/, filename: 'fusee.zip' 
            }] 
        }, 
        { 
            link: 'Huntereb/Awoo-Installer', desiredFiles: [{ 
                exp: /^Awoo-Installer\.zip$/, filename: 'awoo_installer.zip' 
            }] 
        }, 
        { 
            link: 'WerWolv/EdiZon', desiredFiles: [{ 
                exp: /^EdiZon\.nro$/, filename: 'EdiZon.nro' 
            }] 
        }, 
        { 
            link: 'XorTroll/Goldleaf', desiredFiles: [{ 
                exp: /^Goldleaf\.nro$/, filename: 'Goldleaf.nro' 
            }] 
        }, 
        { 
            link: 'SciresM/Checkpoint', desiredFiles: [{ 
                exp: /^Checkpoint\.nro$/, filename: 'Checkpoint.nro' 
            }] 
        }, 
		
		{ 
            link: 'PoloNX/sigpatch-downloader', desiredFiles: [{ 
                exp: /^sigpatch-downloader\.nro$/, filename: 'sigpatch-downloader.nro' 
            }] 
        }, 
		
        { 
            link: 'J-D-K/JKSV', desiredFiles: [{ 
                exp: /^JKSV\.nro$/, filename: 'JKSV.nro' 
            }] 
        }, 
        { 
            link: 'mtheall/ftpd', desiredFiles: [{ 
                exp: /^ftpd\.nro$/, filename: 'ftpd.nro' 
            }] 
        }, 
        { 
            link: 'liuervehc/nxmtp', desiredFiles: [{ 
                exp: /^nxmtp\.nro$/, filename: 'nxmtp.nro' 
            }] 
        }, 
        { 
            link: 'mrdude2478/TinWoo', desiredFiles: [{ 
                exp: /^TinWoo-Installer\.zip$/, filename: 'TinWoo-Installer.zip' 
            }] 
        }, 
        { 
            link: 'meganukebmp/Switch_90DNS_tester', desiredFiles: [{ 
                exp: /^Switch_90DNS_tester\.nro$/, filename: 'Switch_90DNS_tester.nro' 
            }] 
        }];

    let files = [];

    console.log(colors.warning('Récupération de la dernière version des dépôts GitHub en cours...\n'));

    for (let desiredRelease of desiredReleases) {
        const { link, desiredFiles } = desiredRelease;
        let release = await getRelease(link, desiredFiles);
        files = files.concat(release);
    };

    files.push({ name: 'sxgear.zip', url: 'https://sx.xecuter.com/download/SX_Gear_v1.1.zip', version: 'v1.1' }, { name: 'tinfoil.zip', url: 'https://tinfoil.io/Home/Bounce/?url=https%3A%2F%2Ftinfoil.media%2Frepo%2Ftinfoil.latest.zip', version: 'v12.0' }, { name: 'hekate_ipl.ini', url: 'https://nobuyoshi.red/hekate_ipl.ini', version: 'latest' }, { name: 'exosphere.ini', url: 'https://nobuyoshi.red/exosphere.ini', version: 'latest' }, { name: 'sysmmc.txt', url: 'https://nobuyoshi.red/sysmmc.txt', version: 'latest' }, { name: 'emummc.txt', url: 'https://nobuyoshi.red/emummc.txt', version: 'latest'}, { name: 'version.txt', url: 'https://sighya.ga/version.txt', version: '1.0.7' });

    console.log(colors.warning('\nLes fichiers nécessaires à la création du pack sont en cours de téléchargement...'));

    for (let file of files) {
        const { name, url, version } = file;
        let bar;

        if (name == 'hekate.zip')
            hekate_version = version.replace('v', '');
        
        let downloader = new Downloader({ url: url, directory: output_folder, filename: name, cloneFiles: false,
            onBeforeSave: () => {
                console.log(colors.warning(`\nLe fichier ${name} (${version}) est en cours de téléchargement...`));
                bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
                bar.start(100, 0);
            },   
            onProgress: async function(percentage){
                await bar.update(Math.round(percentage));
            }        
        });
        
        try {
            await downloader.download();
            bar.stop();
            console.log(colors.success(`Le fichier ${colors.default(name)} a été téléchargé avec succès.`));
        } catch (e) {
            if (bar)
                bar.stop();
            console.log(colors.error(`Le fichier ${colors.default(name)} n'a pas pu être téléchargé. ${e}`));
            process.exit();
        };
    };

    console.log(colors.success('\nTous les fichiers nécessaires ont été téléchargés.'), colors.warning('\nPréparation du dossier SD...\n'));
    let zip_temp_files = await fs.readdir(output_folder).then(files => { return files.filter(f => f.endsWith('.zip')) });

    for (let zip of zip_temp_files) {
        if(!fs.existsSync(`./temp/${zip.replace('.zip', '')}`))
            await fs.mkdir(`./temp/${zip.replace('.zip', '')}`);
        else {
            await fs.rm(`./temp/${zip.replace('.zip', '')}`, { recursive: true });
            await fs.mkdir(`./temp/${zip.replace('.zip', '')}`);
        };
        await ZIP.extract(`./temp/${zip}`, `./temp/${zip.replace('.zip', '')}`);
        console.log(colors.success(`Le fichier ${colors.default(zip)} a été extrait avec succès.`));
    };

    console.log(colors.warning('\nCréation du fichier boot.dat contenant hekate...'));

    fs.rename(`./temp/hekate/hekate_ctcaer_${hekate_version}.bin`, './temp/hekate/hekate_ctcaer.bin', () => {
        console.log(colors.warning(`Le fichier ${colors.default(`hekate_ctcaer_${hekate_version}.bin`)} a été renommé en ${colors.default('hekate_ctcaer.bin')}.`));
    });

    PythonShell.run('./python/tx_custom_boot.py', null, function (e) {
        if (e) {
            console.log(colors.error(`[Boot.dat] Une erreur est survenue: ${e}`));
        };
        console.log(colors.success(`Le fichier ${colors.default('boot.dat')} a été correctement créé.`));
    });

    try {
        await fs.copy('./temp/atmosphere/', './SD/');
        console.log(colors.success(`\nLe contenu du dossier ${colors.default('temp/atmosphere')} a été copié vers le dossier ${colors.default('SD')}.`));
        await fs.copy('./temp/hekate/bootloader/', './SD/bootloader/');
        console.log(colors.success(`Le contenu du dossier ${colors.default('temp/hekate/bootloader')} a été copié vers le dossier ${colors.default('SD/bootloader')}.`));
        await fs.copy('./temp/fusee/atmosphere/', './SD/atmosphere/');
        console.log(colors.success(`Le contenu du dossier ${colors.default('temp/fusee/atmosphere')} a été copié vers le dossier ${colors.default('SD/atmosphere')}.`));
        await fs.copy('./temp/awoo_installer/switch/', './SD/switch/');
        console.log(colors.success(`Le contenu du dossier ${colors.default('temp/awoo_installer/switch')} a été copié vers le dossier ${colors.default('SD/switch')}.`));
        await fs.copy('./temp/fusee_primary.bin', './SD/bootloader/payloads/fusee-primary.bin');
        console.log(colors.success(`Le fichier ${colors.default('temp/fusee_primary.bin')} a été copié vers le dossier ${colors.default('SD/bootloader/payloads')}`));
        await fs.copy('./temp/hekate/hekate_ctcaer.bin', './SD/payload.bin');
        console.log(colors.success(`Le fichier ${colors.default('temp/hekate/hekate_ctcaer.bin')} a été copié vers le dossier ${colors.default('SD (payload.bin)')}.`));
        await fs.copy('./temp/hekate/hekate_ctcaer.bin', './SD/atmosphere/reboot_payload.bin');
        console.log(colors.success(`Le fichier ${colors.default('temp/hekate/hekate_ctcaer.bin')} a été copié vers le dossier ${colors.default('SD/atmosphere (reboot_payload.bin)')}.`));
        await fs.copy('./temp/hekate_ipl.ini', './SD/bootloader/hekate_ipl.ini');
        console.log(colors.success(`Le fichier ${colors.default('temp/hekate_ipl.ini')} a été copié vers le dossier ${colors.default('SD/bootloader')}.`));
        await fs.copy('./temp/exosphere.ini', './SD/exosphere.ini');
        console.log(colors.success(`Le fichier ${colors.default('temp/exosphere.ini')} a été copié vers le dossier ${colors.default('SD')}.`));
        await fs.copy('./temp/version.txt', './SD/version.txt');
        console.log(colors.success(`Le fichier ${colors.default('temp/version.txt')} a été copié vers le dossier ${colors.default('SD')}.`));

        if (!fs.existsSync('./SD/atmosphere/hosts')) {
            await fs.mkdir('./SD/atmosphere/hosts');
            console.log(colors.success(`Le dossier ${colors.default('hosts')} a été créé dans ${colors.default('SD/atmosphere')}.`));
        };

        await fs.copy('./temp/sysmmc.txt', './SD/atmosphere/hosts/sysmmc.txt');
        console.log(colors.success(`Le fichier ${colors.default('temp/sysmmc.txt')} a été copié vers le dossier ${colors.default('SD/atmosphere/hosts')}.`));
        await fs.copy('./temp/emummc.txt', './SD/atmosphere/hosts/emummc.txt');
        console.log(colors.success(`Le fichier ${colors.default('temp/emummc.txt')} a été copié vers le dossier ${colors.default('SD/atmosphere/hosts')}.`));
        await fs.copy('./temp/TinWoo-Installer/', './SD/');
        console.log(colors.success(`Le contenu du dossier ${colors.default('temp/TinWoo-Installer')} a été copié vers le dossier ${colors.default('SD')}.`));
        await fs.copy('./temp/tinfoil/', './SD/');
        console.log(colors.success(`Le contenu du dossier ${colors.default('temp/tinfoil')} a été copié vers le dossier ${colors.default('SD')}.`));

        let homebrews = await fs.readdir(output_folder).then(files => { return files.filter(f => f.endsWith('nro')) });
        
        for (let homebrew of homebrews) {
            await fs.copy(`./temp/${homebrew}`, `./SD/switch/${homebrew}`);
            console.log(colors.success(`Le contenu du dossier ${colors.default(`temp/${homebrew}`)} a été copié vers le dossier ${colors.default('SD/switch')}.`));
        };

        console.log(colors.success('\nLe pack est en cours de création...\n'));
        await ZIP.archiveFolder('./SD', './pack.zip');

        console.log(colors.success('Voici le contenu du pack:'));
        for (let file of files) {
            const { name, version } = file;
            console.log(colors.default(`${name} (${version})`));
        };

        await fs.emptyDir('./temp/', { recursive: true });
        console.log(colors.warning(`\nLe contenu du dossier ${colors.default('temp')} a été supprimé.`), colors.success(`\nLe pack a été créé avec succès ${colors.default('(pack.zip)')}.`));
    } catch (e) {
        console.log(colors.error(`[Copie et création du pack.zip] Une erreur est survenue: ${e}`));
    };
})();
