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

const path = require('path');
const _ = require('lodash');
const {
  entities: {Account: AccountEntity},
} = require('lisk-framework/src/components/storage');

const readOnlyFields = ['address'];

const sqlFiles = {
  updateOne: 'accounts/update_one.sql',
};

class RollAccount extends AccountEntity {
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

module.exports = RollAccount;
