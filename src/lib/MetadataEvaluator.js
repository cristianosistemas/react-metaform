import expressionEvaluator from './ExpressionEvaluator.js';

// metadata filters
import defaultMetadataFilter from './metadataEvaluatorFilters/defaultMetadataFilter.js';
import entityMetadataFilter from './metadataEvaluatorFilters/entityMetadataFilter.js';
import arrayMetadataFilter from './metadataEvaluatorFilters/arrayMetadataFilter.js';
import valueSetterMetadataFilter from './metadataEvaluatorFilters/valueSetterMetadataFilter.js';
import onChangeSetterMetadataFilter from './metadataEvaluatorFilters/onChangeSetterMetadataFilter.js';

// property filters
import defaultPropertyMetadataFilter from './metadataEvaluatorPropertyFilters/defaultMetadataPropertyFilter.js';
import conditionMessagePropertyFilter from './metadataEvaluatorPropertyFilters/conditionMessagePropertyFilter.js';
import _ from 'underscore';

class MetadataEvaluatorRedux {

    constructor() {
        // this array contains objects like: { property: 'invalid', filter: filter }
        // metadataPropertyFilters that don't have a property associated will act on all properties
        // in the order they were registered
        this.metadataPropertyFilters = [];
        // this array contains metadata filters
        this.metadataFilters = [];
    }

    /**
     * Evaluates the given expression against the model
     * @param expression
     * @param model
     * @private
     */
    _evaluateExpression(expression, model) {
        return expressionEvaluator.evaluate(expression, model);
    }

    /**
     * Evaluates the given metadata against the model
     * @param propertyMetadata - Can be either an object or an array of objects
     * @param model
     * @param keyPrefix
     * @param metadataIndex
     * @param onChange
     * @returns {{}}
     */
    evaluate(propertyMetadata, model, keyPrefix, metadataIndex, reduxProps, onChange) {

        if(!propertyMetadata) throw Error('Argument \'propertyMetadata\' should be truthy')

        if (propertyMetadata.constructor === Array) {
            return propertyMetadata.map(i => this.evaluate(i, model, keyPrefix, metadataIndex, reduxProps, onChange));
        }
        if (!metadataIndex) {
            metadataIndex = {};
        }

        let resultingPropertyMetadata = {};
        // filters every field in the property metadata
        for (var fieldName in propertyMetadata) {
            if (propertyMetadata.hasOwnProperty(fieldName)) {
                resultingPropertyMetadata[fieldName] = this.filterPropertyField(fieldName, propertyMetadata[fieldName], model);
            }
        }

        // experimenting setting the value property of each metadata
        let newPrefix = keyPrefix ? `${keyPrefix}.${propertyMetadata.name}` : propertyMetadata.name;
        // // key is a special prop in React, so it knows 'what' component this is
        // resultingPropertyMetadata.key = newPrefix;
        // // because key is inaccessible from a React component, we need to replicate it into an 'id' prop
        // resultingPropertyMetadata.id = resultingPropertyMetadata.key;

        // populates de index
        metadataIndex[resultingPropertyMetadata.key] = resultingPropertyMetadata;

        return this.filterProperty(resultingPropertyMetadata, model, newPrefix, metadataIndex, reduxProps, onChange);
    }

    /**
     * Adds the given filter
     * @param 
     */
    addPropertyFilter(filter) {
        if (!filter) {
            throw new Error('filter is required');
        }
        this.metadataFilters.push(filter);
    }

    /**
     * Adds the given filter for the given metadata property name
     * @param metadataProperty
     * @param filter
     */
    addPropertyFieldFilter(filter, metadataProperty) {
        if (!filter) {
            throw new Error('filter is required');
        }
        this.metadataPropertyFilters.push({property: metadataProperty, filter: filter});
    }

    /**
     * Filters the given property against the model
     * @param propertyName
     * @param propertyValue
     * @param model
     */
    filterPropertyField(propertyName, propertyValue, model) {
        let processedPropertyValue = propertyValue;
        for (let i = 0; i < this.metadataPropertyFilters.length; i++) {
            if (!this.metadataPropertyFilters[i].property || this.metadataPropertyFilters[i].property === propertyName) {
                processedPropertyValue = this.metadataPropertyFilters[i].filter.filter(propertyName, processedPropertyValue, model);
            }
        }
        return processedPropertyValue;
    }

    /**
     * Filters the given metadata against the model
     * @param metadata
     * @param model
     * @returns {*}
     */
    filterProperty(metadata, model, keyPrefix, metadataIndex, reduxProps, onChange) {
        let processedMetadata = metadata;
        for (let i = 0; i < this.metadataFilters.length; i++) {
            processedMetadata = this.metadataFilters[i].filter(processedMetadata, model, keyPrefix, this, metadataIndex, reduxProps, onChange);
        }
        return processedMetadata;
    }

    /**
     * Returns whether or not the given property exists in the given metadata
     * @param metadata
     * @param property
     * @returns {*|boolean}
     */
    exists(metadata, property) {
        return metadata && metadata.hasOwnProperty(property);
    }

}

let metadataEvaluator = new MetadataEvaluatorRedux();

// register metadata filters
metadataEvaluator.addPropertyFilter(defaultMetadataFilter); // sets redux props, key and id
metadataEvaluator.addPropertyFilter(entityMetadataFilter); // processes entities
metadataEvaluator.addPropertyFilter(arrayMetadataFilter); // processes arrays

// register property field filters
metadataEvaluator.addPropertyFieldFilter(defaultPropertyMetadataFilter); // evaluates functions to literals

export default metadataEvaluator;