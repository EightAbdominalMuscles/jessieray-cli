'use strict';
const path = require('path')

const Package = require('@jessieray-cli-dev/package')
const log = require('@jessieray-cli-dev/log')
const {exec: spawn} = require('@jessieray-cli-dev/utils')
const SETTINGS = {
    init: '@jessieray-cli-dev/init'
}
const CACHE_DIR = 'dependencies'
let pkg
async function exec() {
    let storeDir = ''
    let targetPath = process.env.CLI_TARGET_PATH
    const homePath = process.env.CLI_HOME_PATH
    log.verbose('targetPath', targetPath)
    log.verbose('homePath', homePath)
    const cmdObj = arguments[arguments.length -1]
    const cmdName = cmdObj.name()
    const packageName = SETTINGS[cmdName]
    const packageVersion = 'latest'
    if (!targetPath) {
        targetPath = path.resolve(homePath, CACHE_DIR) // 生成缓存路径
        storeDir = path.resolve(targetPath, 'node_modules')
        log.verbose('targetPath', targetPath)
        log.verbose('storeDir', storeDir)
        pkg = new Package({
            targetPath,
            packageName,
            packageVersion,
            storeDir
        })
        if(await pkg.exists()) {
            // 更新package
            await pkg.update()
        } else {
            // 安装package
           await pkg.install()
        }
    } else {
        pkg = new Package({
            targetPath,
            packageName,
            packageVersion,
        })
    }
    const rootFile = pkg.getRootFilePath()
    if (rootFile) {
        try {
            // 在node子进程中调用
            const args = Array.from(arguments)
            const cmd = args[args.length - 1].opts()
            // cmd 去除原型链上的属性 start
            // 1. 创建一个空的对象
            const o = Object.create(null)
            // 2. 循环赋值
            Object.keys(cmd).forEach(key => {
                if(cmd.hasOwnProperty(key) && !key.startsWith('_') && key !== 'parent') {
                    o[key] = cmd[key]
                }
            })
            // cmd 去除原型链上的属性 end
            args[args.length - 1] = o
            const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`
            
            const child = spawn('node', ['-e', code], {
                cwd: process.cwd(),
                stdio: 'inherit',
            })
            child.on('error', e => {
                log.error(e.message)
                process.exit(1)
            })
            child.on('exit', e => {
                log.verbose('命令执行成功', e)
            })
        } catch (e) {
            log.error(e.message)
        }
    }
}


module.exports = exec;
