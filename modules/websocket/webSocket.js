/*
MIT License

Copyright (c) 2020 ThePool.io

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Copyright © 2019 Lisk Foundation
 
See the LICENSE file at the top-level directory of this distribution for licensing information.
 
Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
no part of this software, including this file, may be copied, modified,
propagated, or distributed except according to the terms contained in the
LICENSE file.
 
Removal or modification of this copyright notice is prohibited.
*/

'use strict';

const { createLoggerComponent } = require('lisk-framework/src/components/logger');
const { createStorageComponent } = require('lisk-framework/src/components/storage');
const { BSCustomStorage } = require('../../cstorage/init');
const wsRequests = require('./wsRequests');
const wsEvents = require('./wsEvents');
const WebSocketIo = require('socket.io')();

module.exports = class WebSocket {
  constructor(channel, options) {
    this.channel = channel;
    this.options = { WebSocketPort: 5005, Public: true, ...options };
    this.logger = null;
    this.scope = null;
  }

  async bootstrap() {
    global.constants = this.options.constants;

    // Logger
    const loggerConfig = await this.channel.invoke('app:getComponentConfig','logger');
    this.logger = createLoggerComponent({...loggerConfig, module: 'websocket'});
    
    //Storage
    this.logger.debug('Initiating storage...');
    const storageConfig = await this.channel.invoke('app:getComponentConfig','storage');

    //Storage logging
    const dbLogger = storageConfig.logFileName && storageConfig.logFileName === loggerConfig.logFileName ? this.logger: createLoggerComponent({...loggerConfig,logFileName: storageConfig.logFileName,module: 'websocket:database'});
    const storage = createStorageComponent(storageConfig, dbLogger);
    const applicationState = await this.channel.invoke('app:getApplicationState');

    //Setup scope
    this.scope = {components: {logger: this.logger,storage},channel: this.channel,config: this.options,applicationState};

    //Init custom storage
    this.logger.debug('Initiating BSCustomStorage for WebSocket module');
    await BSCustomStorage(this.scope, global.constants.ACTIVE_DELEGATES);

    //Init socket.io
    WebSocketIo.on('connection', client => {
      wsRequests(this.scope, client);
      wsEvents(this.scope, client);
    });
    if (this.options.Public) {
      this.logger.info('Starting WebSocket module at port:' + this.options.WebSocketPort + " with public access");
      WebSocketIo.listen(this.options.WebSocketPort);
    } else {
      this.logger.info('Starting WebSocket module locally at 127.0.0.1:' + this.options.WebSocketPort);
      WebSocketIo.listen("127.0.0.1"+this.options.WebSocketPort);
    }
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
    this.logger.info('Cleaning WebSocket module...');
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
