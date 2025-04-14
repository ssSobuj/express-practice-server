const { getDB } = require("../config/db");

async function getNextSequenceValue(sequenceName) {
  const db = getDB();
  const countersCollection = db.collection("counters");

  const sequenceDocument = await countersCollection.findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { sequence_value: 1 } },
    { returnDocument: "after", upsert: true }
  );

  return sequenceDocument.sequence_value;
}

module.exports = { getNextSequenceValue };
