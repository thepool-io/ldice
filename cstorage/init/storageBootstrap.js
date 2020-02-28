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

const { CustomAccountEntity } = require('../components/storage/entities');

module.exports = async ({components: {storage, logger}}, accountLimit) => {
  try {
    storage.registerEntity('Account', CustomAccountEntity, {
      replaceExisting: true,
    });
    const status = await storage.bootstrap();
    if (!status) {
      throw new Error('Can not bootstrap the storage component');
    }
    storage.entities.Account.extendDefaultOptions({
      limit: accountLimit,
    });
  } catch (err) {
    logger.error(err);
    throw err;
  }
};
