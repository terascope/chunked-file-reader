'use strict';

const Promise = require('bluebird');
const chunkedFileReader = require('../index.js');


const mockLogger = {
    error: msg => msg
};

function mockReader(offset) {
    switch (offset) {
    case 0:
        // Start slice
        return new Promise(resolve => resolve('{"test1": "data"}\r\n\f{"test2": "data"}\r\n\f{"test3": "data"'));
    case 5:
        // Margin for start slice
        return new Promise(resolve => resolve('}\r\n\f{"test4": "data"}\r\n\f'));
    case 10:
        // middle slice ending with complete record
        return new Promise(resolve => resolve('\r\n\f{"test4": "data"}\r\n\f{"test5": "data"}\r\n\f{"test6": "data"}\r\n\f'));
    case 20:
        // End slice with partial record at start
        return new Promise(resolve => resolve('{"test6": "data"}\r\n\f{"test7": "data"}\r\n\f{"test8": "data"}\r\n\f'));
    case 100:
        return new Promise(resolve => resolve('\r\n\f{"test4": "data"}\r\n\f{"test5": data}\r\n\f{"test6": "data"}\r\n\f'));
    default:
        return new Error('bad offset!!');
    }
}

const opConfig = {
    delimiter: '\r\n\f',
    format: 'json'
};

// Test where one record is invalid JSON
const funkySlice = {
    offset: 100,
    length: 5,
    total: 30
};

// This will test both a starting slice and the margin collection
const startSlice = {
    offset: 0,
    length: 5,
    total: 30
};

// This will verify the margin is not collected on a middle slice ending in a complete record. Also
// verifies a slice starting with a complete record
const middleSlice = {
    offset: 10,
    length: 10,
    total: 30
};

// Tests an end slice that starts with a partial record
const endSlice = {
    offset: 20,
    length: 10,
    total: 30
};

// Used to test average record size calculation
const testData = [
    '{"test1":"data"}',
    '{"test2":"data"}',
    '{"test3":"data"}',
    '{"test4":"data"}',
    '{"test5":"data"}',
    '{"test6":"data"}',
    '{"test7":"data"}',
    '{"test8":"data"}'
];


describe('The chunked file reader', () => {
    it('does not let one bad record spoil the bunch', (done) => {
        chunkedFileReader.getChunk(mockReader, funkySlice, opConfig, mockLogger)
            .then((data) => {
                expect(data).toEqual([{ test4: 'data' }, { test6: 'data' }]);
                done();
            });
    });
    it('supports optional formatting/parsing', (done) => {
        chunkedFileReader.getChunk(mockReader, startSlice, { ...opConfig, format: 'pass' }, mockLogger)
            .then((data) => {
                expect(data).toEqual(['{"test1": "data"}', '{"test2": "data"}', '{"test3": "data"}']);
                done();
            });
    });
    it('properly handles a start slice and margin collection.', (done) => {
        chunkedFileReader.getChunk(mockReader, startSlice, opConfig, mockLogger)
            .then((data) => {
                expect(data).toEqual([{ test1: 'data' }, { test2: 'data' }, { test3: 'data' }]);
                done();
            });
    });
    it('properly handles a middle slice with a complete record and without margin '
        + 'collection.', (done) => {
        chunkedFileReader.getChunk(mockReader, middleSlice, opConfig, mockLogger)
            .then((data) => {
                expect(data).toEqual([{ test4: 'data' }, { test5: 'data' }, { test6: 'data' }]);
                done();
            });
    });
    it('properly handles a end slice starting with a partial record.', (done) => {
        chunkedFileReader.getChunk(mockReader, endSlice, opConfig, mockLogger)
            .then((data) => {
                expect(data).toEqual([{ test7: 'data' }, { test8: 'data' }]);
                done();
            });
    });
    it('accurately calculates average record size.', () => {
        const avgSize = chunkedFileReader._averageRecordSize(testData);
        expect(avgSize).toEqual(16);
    });
});
