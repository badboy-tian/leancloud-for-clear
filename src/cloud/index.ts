import AV from 'leanengine'
import pMap from 'p-map';
import * as util from '../util';
import Readlines from 'n-readlines'
import { getQueue } from '../bull';


AV.Cloud.define('TestCloudFunc', async request => {
  return '这是一个示例云函数'
})

/**
 * 任务的数据类型
 */
type IJobDataUser = {
  /** 用户id */
  u: string
}

type IJobDataFile = {
  /** 文件id */
  f: string
}

/** 处理用户的队列 */
const userQueue = getQueue<IJobDataUser>('user-queue', {
  singleEnv: true,
  defaultJobOptions: {
    attempts: 10,
    removeOnFail: 100000,
    timeout: 10 * 60 * 1000 // 10分钟超时
  }
})

/** 处理文件的队列 */
const fileQueue = getQueue<IJobDataFile>('file-queue', {
  singleEnv: true,
  defaultJobOptions: {
    attempts: 10,
    removeOnFail: 100000,
    timeout: 10 * 60 * 1000 // 10分钟超时
  }
})

/** 定义 用户队列如何处理 */
userQueue.process(50, async job => {
  const user = AV.User.createWithoutData('_User', job.data.u)
  user.disableAfterHook()
  user.disableBeforeHook()
  await user
    .set('icon', AV.File.createWithoutData('6278ab924fb5b8572d1b421b'))
    .unset('detail')
    .save()
})

/** 定义文件队列如何处理 */
fileQueue.process(50, async job => {
  // 直接删除文件
  await AV.File.createWithoutData(job.data.f).destroy()
})

/**
 * 云函数的参数是需要下载的任务数据文本的url
 * 1. 根据云函数参数里的url下载队列任务数据
 * 2. 下载了之后，把每一行的数据，创建成任务
 * 3. 任务执行统一由bull负责
 * 4. 注意任务id，如果队列里面已经有同样id的任务，则重新添加这个任务是无效的
 * 5. 注意云函数不等待任务结束，只是负责添加
*/
AV.Cloud.define('PostClearJobs', async request => {
  const urls = (request.params as string[] || []).filter(util.isValidHttpUrl)
  console.log(urls);
  await pMap(urls, async url => {
    // 创建一个临时文件
    const tmpFile = await util.tmpFile()
    // 把url下载到这个临时文件
    await util.downloadFile(url, tmpFile.path)
    // 一行行读取
    const rl = new Readlines(tmpFile.path)
    let lineBuffer : boolean | Buffer = false
    do {
      lineBuffer = rl.next()
      if (lineBuffer ) {
        const lineString = lineBuffer.toString('utf-8')
        const data: string[] = lineString?.split(',')?.map(d => d?.trim())?.filter(v => !!v)
        // data[0] - 用户id；data[1] - file id
        if (!data?.[0]) return // 如果没有用户id，则跳过
        userQueue.add({
          u: data[0],
        }, {
          jobId: data[0] // 以用户id作为任务id，保证任务唯一性
        })
        // 如果有文件id
        if (data[1]) {
          fileQueue.add({
            f: data[1]
          }, { jobId: data[1] })
        }
      }
    } while (!!lineBuffer)
    // 清理临时文件
    tmpFile.cleanup()
  }, { concurrency: 1 })
  return `Added ${ urls.length } urls`
})