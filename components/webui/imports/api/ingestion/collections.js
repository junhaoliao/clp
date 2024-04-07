import {Mongo} from "meteor/mongo";


const StatsCollection = new Mongo.Collection(Meteor.settings.public.StatsCollectionName);

const STATS_COLLECTION_ID_COMPRESSION = "compression_stats";

const CompressionJobsCollection = new Mongo.Collection(
    Meteor.settings.public.CompressionJobsCollectionName
);

export {
    CompressionJobsCollection,
    STATS_COLLECTION_ID_COMPRESSION,
    StatsCollection,
};
