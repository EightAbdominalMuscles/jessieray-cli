const request = require('@jessieray-cli-dev/request')

module.exports = async function () {
  return request({
    url: '/project/template'
  })
}
