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

const path = require('path');
const _ = require('lodash');
const {
  entities: {Account: AccountEntity},
} = require('lisk-framework/src/components/storage');

const readOnlyFields = ['address'];

const sqlFiles = {
  updateOne: 'accounts/update_one.sql',
};

class CustomAccountEntity extends AccountEntity {
  /**
   * Constructor
   * @param {BaseAdapter} adapter - Adapter to retrive the data from
   * @param {filters.Account} defaultFilters - Set of default filters applied on every query
   */
  constructor(adapter, defaultFilters = {}) {
    super(adapter, defaultFilters);

    this.sqlDirectory = path.join(path.dirname(__filename), '../sql');

    this.SQLs = this.loadSQLFiles('account', sqlFiles, this.sqlDirectory);
  }

  /**
   * Update one record based on the condition given
   *
   * @param {filters.Account} filters
   * @param {Object} data
   * @param {Object} [options]
   * @param {Object} tx - Transaction object
   * @return {*}
   */
  updateOne(filters, data, _options, tx) {
    const atLeastOneRequired = true;
    this.validateFilters(filters, atLeastOneRequired);
    const objectData = _.omit(data, readOnlyFields);
    const mergedFilters = this.mergeFilters(filters);
    const parsedFilters = this.parseFilters(mergedFilters);
    const updateSet = this.getUpdateSet(objectData);
    const params = {
      ...objectData,
      parsedFilters,
      updateSet,
    };
    return this.adapter.executeFile(this.SQLs.updateOne, params, {}, tx);
  }
}

module.exports = CustomAccountEntity;
