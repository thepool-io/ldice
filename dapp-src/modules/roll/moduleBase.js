/*
 * Copyright © 2019 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

const {createLoggerComponent} = require('lisk-framework/src/components/logger');
const {createStorageComponent} = require('lisk-framework/src/components/storage');
const {bootstrapStorage} = require('./init_steps');
const drawing = require('./drawing.js');

module.exports = class Drawing {
  constructor(channel, options) {
    this.channel = channel;
    this.options = { blockHashDistance: 1, ...options };
    this.logger = null;
    this.scope = null;
    if (this.options.blockHashDistance < 1 || this.options.blockHashDistance > 10) {
      this.options.blockHashDistance = 2;
    }
  }

  async bootstrap() {
    global.constants = this.options.constants;
    // Logger
    const loggerConfig = await this.channel.invoke(
      'app:getComponentConfig',
      'logger',
    );
    this.logger = createLoggerComponent({
      ...loggerConfig,
      module: 'drawing',
    });
    //Storage
    this.logger.debug('Initiating storage...');
    const storageConfig = await this.channel.invoke(
      'app:getComponentConfig',
      'storage',
    );
    const dbLogger =
      storageConfig.logFileName &&
      storageConfig.logFileName === loggerConfig.logFileName
        ? this.logger
        : createLoggerComponent({
          ...loggerConfig,
          logFileName: storageConfig.logFileName,
          module: 'drawing:database',
        });
    const storage = createStorageComponent(storageConfig, dbLogger);
    const applicationState = await this.channel.invoke(
      'app:getApplicationState',
    );
    //Setup scope
    this.scope = {
      components: {
        logger: this.logger,
        storage,
      },
      channel: this.channel,
      config: this.options,
      applicationState,
    };
    await bootstrapStorage(this.scope, global.constants.ACTIVE_DELEGATES);
    drawing(this.scope, this.logger);
  }

  async cleanup(code, error) {
    const {components} = this.scope;
    if (error) {
      this.logger.fatal(error.toString());
      if (code === undefined) {
        code = 1;
      }
    } else if (code === undefined || code === null) {
      code = 0;
    }
    this.logger.info('Cleaning Drawing module...');
    try {
      if (components !== undefined) {
        Object.keys(components).forEach(async key => {
          if (components[key].cleanup) {
            await components[key].cleanup();
          }
        });
      }
    } catch (componentCleanupError) {
      this.logger.error(componentCleanupError);
    }
    this.logger.info('Cleaned up successfully');
  }
};
