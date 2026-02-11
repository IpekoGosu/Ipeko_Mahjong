import { Logger } from '@nestjs/common'

// Mock the Logger class to do nothing
jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})
jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {})
jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => {})

// Also mock static methods
Logger.log = () => {}
Logger.error = () => {}
Logger.warn = () => {}
Logger.debug = () => {}
Logger.verbose = () => {}

// Globally silence NestJS framework logs in tests
Logger.overrideLogger(false)
