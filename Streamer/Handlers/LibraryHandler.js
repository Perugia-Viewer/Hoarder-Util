const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const fsp = {
    readdir: promisify(fs.readdir),
    access: promisify(fs.access)
};

const basePath = process.env.SCAN_PATH || './';
const THUMB_PATH = '/thumb.jpg';

/**
 * Scan library. If no show is detected then just get root dir and their thumbnails
 * @param {string} show 
 */
const scanLibrary = async (show) => {
    const usePath = show ? path.resolve(basePath, show) : basePath;
    let list = await fsp.readdir(usePath);

    list = !!show ? await buildSub(basePath, show) : await filterDirectories(usePath, list);
    
    return list;
};

/**
 * 
 * @param {string} basePath Root path to construct abs path from
 * @param {string[]} input List of files in the directory
 */
const buildSub = async (basePath, show) => {
    const showPath = path.resolve(basePath, show);
    const input = await fsp.readdir(showPath);
    let result = [];
    for (let i = 0; i < input.length; i++) {
        if (await isDirectory(path.resolve(showPath, input[i]))) {
            let dirContents = await buildSub(showPath, input[i]);
            result.push(...dirContents);
        } else {
            if (input[i].indexOf('mp4') === -1 && input[i].indexOf('m4v') === -1) continue;
            if (input[i][0] === '.') continue;
            result.push({
                file: input[i],
                season: show
            });
        }
    }
    return result;
};

const getThumbPath = async (name) => {
    const target = path.resolve(basePath, name, 'thumb.jpg');
    if (await checkAccess(target)) {
        return target;
    }
    const aquas = await fsp.readdir(path.resolve(__dirname, '/public/aquas'));

    return path.resolve(__dirname, aquas[Math.floor(Math.random() * aquas.length)]);
};

const checkAccess = async (path) => {
    return new Promise(resolve => {
        fs.access(path, fs.constants.R_OK, err => {
            if (err) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

/**
 * Get only the dirs
 * @param {string[]} input 
 */
const filterDirectories = async (basePath, input) => {
    let result = [];
    for (let i = 0; i < input.length; i++) {
        if (await isDirectory(path.resolve(basePath, input[i])) && input[i][0] !== '.')
            result.push({
                filePath: input[i],
                thumb: input[i] + THUMB_PATH
            });
    }
    return result;
};

const isDirectory = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.lstat(filePath, (err, stats) => {
            if (err) return reject(err);
            resolve(stats.isDirectory());
        });
    });
};

module.exports = {
    getThumbPath,
    scanLibrary
};