import { ExpressAdapter } from '@bull-board/express'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { BullAdapter } from '@bull-board/api/bullAdapter'
import BullQueue, { JobOptions as BullJobOptions, QueueOptions as BullQueueOptions } from 'bull'

export const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/bull-queues')
const bullBoard = createBullBoard({ queues: [], serverAdapter })

/**
 * 主要是用来显示不同次job log之间的时间间隔
 */
export class JobLogger {
  public startTime: number
  public logToConsole: boolean = true
  constructor(logToConsole: boolean) {
    this.startTime = Date.now()
    this.logToConsole = logToConsole
  }
  public log(msg: string) {
    const time = Date.now() - this.startTime
    let timeString = `${time}ms`
    if (time >= 1000 && time < 60000) {
      timeString = `${(time / 1000).toFixed(2)}s`
    } else if (time >= 60000) {
      timeString = `${Math.floor(time / 60000)}m${Math.round((time % 60000) / 1000)}s`
    }
    const content = `${timeString}: ${msg}`
    if (this.logToConsole) {
      console.log(content)
    }
    return content
  }
}

interface IGetQueue {
  /** 单一环境 - 如果开启的话，则不根据NODE_ENV区分队列名称 
   * 主要用在小程序扫码支付的时候，只会打开生产环境的小程序，因此需要生产环境和预备环境使用同一个支付队列
  */
  singleEnv?: boolean
}

export function getQueue<T>(name: string, queueOptions?: BullQueueOptions & IGetQueue) {
  // 如果没有开启单一队列，则需要根据环境来设置队列名称
  if (!queueOptions?.singleEnv) {
    let env = ''
    if (process.env.NODE_ENV === 'staging') env = 'stg'
    else if (process.env.NODE_ENV === 'production') env = 'prd'
    name = [env, name].join('-') // 在队列名称上加上环境，以区分不同环境的队列
  }
  const queue = new BullQueue<T>(name, queueOptions?.redis?.path || process.env.REDIS_URL_ball1!, queueOptions)
  bullBoard.addQueue(new BullAdapter(queue))
  return queue
}
