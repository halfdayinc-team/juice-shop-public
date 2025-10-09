// Import fuzzball library
const fuzzball = require('fuzzball');

// Sample function utilizing fuzzball
function getBestMatch(query, choices) {
	// Returns the best match from choices for the given query
	const result = fuzzball.extract(query, choices, { scorer: fuzzball.ratio, limit: 1 });
	return result.length > 0 ? result[0][0] : null;
}


// Example usage
const choices = ['apple', 'banana', 'grape', 'orange'];
const query = 'appl';
console.log('Best match:', getBestMatch(query, choices));
