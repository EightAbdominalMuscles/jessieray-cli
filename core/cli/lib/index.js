'use strict';


module.exports = core;
const path = require('path')

const {Command} = require('commander')
const semver = require('semver')
const colors = require('colors/safe')
const userHome = require('user-home')
const pathExists = require('path-exists').sync

const pkg = require('../package.json')
const constant = require('./const')
const log = require('@jessieray-cli-dev/log')
const exec = require('@jessieray-cli-dev/exec')
const program = new Command()

async function core() {
    // TODO
    try{
        await prepare()
        registerCommand()
    }catch(e) {
        log.error(e.message);

        if (program.opts().debug) {
            console.log(e)
        }
    }
}

function registerCommand () {
    program
        .name(Object.keys(pkg.bin)[0])
        .usage('<command> [options]')
        .version(pkg.version)
        .option('-d, --debug', '是否开启调试模式', false)
        .option('-tp, --targetPath <targetPath>', '是否指定本地调试文件路径', '')
    program
        .command('init [projectName]')
        .option('-f, --force', '是否强制初始化项目')
        .action(exec)
    // 监听选择路径
    program.on('option:targetPath', function () {
        process.env.CLI_TARGET_PATH = program.opts().targetPath
    })
    // 开启debug 模式
    program.on('option:debug', function () {
        const options = program.opts();
        if (options.debug) {
            process.env.LOG_LEVEL = 'verbose'
        } else {
            process.env.LOG_LEVEL = 'info'
        }
        log.level = process.env.LOG_LEVEL
    })
    // 未知命令监听
    program.on('command:*', function (obj) {
        const availableCommand = program.commands.map(cmd => cmd.name())
        console.log(colors.red('未知的命令：', obj[0]))
        if(availableCommand.length > 0) {
            console.log(colors.red('可用命令：', availableCommand.join(',')))
        }
    })
    program.parse(process.argv)

    // 命令
    if (program.args && program.args.length < 1) {
        program.outputHelp()
        console.log()
    }
    
}
async function prepare() {
    checkPkgVerison()
    checkRoot()
    checkUserHome()
    checkEnv()
    await checkGlobalUpdate()
}

async function checkGlobalUpdate() {
    // 1. 获取当前版本号和模块名
    const currentVersion = pkg.version
    const npmName = pkg.name
    // 2. 调用npm API，获取所有版本号
    const {getNpmSemverVersion} = require('@jessieray-cli-dev/get-npm-info')
    const lastVersions = await getNpmSemverVersion(currentVersion, npmName)
    // 3. 提取所有版本号，对比那些版本号大于当前版本号
    // 4.获取最新的版本号。提示用户更新到该版本
    if (lastVersions && semver.gt(lastVersions, currentVersion)) {
        log.warn(colors.yellow(`请手动更新${npmName}, 当前版本：${currentVersion}, 最新版本：
        ${lastVersions} 
                        更新命令： npm install -g ${npmName}`))
    }
}

function checkEnv() {
    const dotenv = require('dotenv')
    const dotenvPath = path.resolve(userHome, '.env')
    if(pathExists(dotenvPath)) {
        dotenv.config({
            path: dotenvPath
        })
    }
    createDefaultConfig()
}
function createDefaultConfig() {
    const cliConfig = {
        home: userHome
    }
    if(process.env.CLI_HOME) {
        cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME)
    } else {
        cliConfig['cliHome'] = path.join(userHome, constant.DEFAULT_CLI_HOME)
    }
    process.env.CLI_HOME_PATH = cliConfig.cliHome
}

function checkUserHome() {
    if (!userHome || !pathExists(userHome)) {
        throw new Error(colors.red('当前登录用户主目录不存在！'))
    }
}
function checkRoot() {
    const rootCheck = require('root-check')
    rootCheck()
}

function checkPkgVerison() {
    log.info('cli', pkg.version)
}
// 移入registerCommand中
// let args
// function checkInputArgs() {
//     const minimist = require('minimist')
//     args = minimist(process.argv.slice(2))
//     checkArgs()
// }
// function checkArgs() {
//     if (args.debug) {
//         process.env.LOG_LEVEL = 'verbose';
//     } else {
//         process.env.LOG_LEVEL = 'info'
//     }
//     log.level = process.env.LOG_LEVEL
// }