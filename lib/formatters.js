'use strict';

const Promise = require('bluebird');
const { DataEntity } = require('@terascope/utils');

// No parsing, leaving to reader or a downstream op.
function raw(data, logger, metadata, opConfig) {
    return Promise.map(data, (record) => {
        try {
            return DataEntity.make(
                { data: record },
                metadata
            );
        } catch (err) {
            if (opConfig._dead_letter_action === 'log') {
                logger.error('Bad record');
                logger.error(err);
            } else if (opConfig._dead_letter_action === 'throw') {
                throw err;
            }
            return null;
        }
    });
}

function json(data, logger, metadata, opConfig) {
    return Promise.map(data, (record) => {
        try {
            return DataEntity.fromBuffer(
                record,
                opConfig,
                metadata
            );
        } catch (err) {
            if (opConfig._dead_letter_action === 'log') {
                logger.error('Bad record');
                logger.error(err);
            } else if (opConfig._dead_letter_action === 'throw') {
                throw err;
            }

            return null;
        }
    });
}

module.exports = {
    raw,
    json
};
