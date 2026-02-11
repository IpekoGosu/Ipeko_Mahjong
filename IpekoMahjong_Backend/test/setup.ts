import { Logger } from '@nestjs/common'

// Mock the Logger class to do nothing
jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})
jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {})
jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => {})

// Also mock static methods
jest.spyOn(Logger, 'log').mockImplementation(() => {})
jest.spyOn(Logger, 'error').mockImplementation(() => {})
jest.spyOn(Logger, 'warn').mockImplementation(() => {})
jest.spyOn(Logger, 'debug').mockImplementation(() => {})
jest.spyOn(Logger, 'verbose').mockImplementation(() => {})

// Globally silence NestJS framework logs in tests
Logger.overrideLogger(false)
