const { v4: uuidv4, parse } = require('uuid');

const uuidHelper = {
    generateBinaryUUID: () => {
        const idString = uuidv4();
        const idBuffer = Buffer.from(parse(idString)); 
        return { idString, idBuffer };
    }
};

module.exports = uuidHelper;