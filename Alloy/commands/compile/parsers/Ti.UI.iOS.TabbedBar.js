var _ = require('../../../lib/alloy/underscore')._,
	U = require('../../../utils'),
	CU = require('../compilerUtils'),
	logger = require('../../../common/logger');

exports.parse = function(node, state) {
	return require('./base').parse(node, state, parse);
};

function parse(node, state, args) {
	var children = U.XML.getElementsFromNodes(node.childNodes),
		arrayName = CU.generateUniqueId(),
		code = 'var ' + arrayName + ' = [];\n';

	// process all Items and create their array, if present
	_.each(U.XML.getElementsFromNodes(node.childNodes), function(theNode) {
		if (theNode.nodeName === 'Labels' && !theNode.getAttribute('ns')) {
			_.each(U.XML.getElementsFromNodes(theNode.childNodes), function(item, index) {
				if (item.nodeName === 'Label' && !item.getAttribute('ns')) {
					// per the Titanium docs, these "labels" can be represented as
					// either strings or object literals. The object literal can have the
					// following properties
					// * enabled 
					// * image 
					// * title 
					// * width 
					var obj = {};
					var title = (U.XML.getNodeText(item) || item.getAttribute('title') || '');
					var image = item.getAttribute('image');
					var enabled = item.getAttribute('enabled') !== 'false'; // defaults to true
					var width = item.getAttribute('width');

					if (title) { obj.title = title; }
					if (image) { obj.image = image; }
					if (!enabled) { obj.enabled = false; }
					if (width) { obj.width = width; }

					if (_.isEmpty(obj)) {
						// warn if ther ewas no properties assigned
						logger.warn('Child element of <TabbedBar> at index ' + index + ' has no properties');
					} else if (obj.title && obj.length === 1) {
						obj = obj.title;
					}

					code += arrayName + '.push(' + JSON.stringify(obj) + ');\n';
				} else {
					U.die([
						'Child element of <TabbedBar> at index ' + index + ' is not a <Label>',
						'All child elements of <TabbedBar> must be a <Label>.'
					]);
				}
			});

			// get rid of the items when done
			node.removeChild(theNode);
		} 
	});

	// Create the initial Toolbar code and let it process its remaing children, if any
	state.extraStyle = CU.createVariableStyle('labels', arrayName);
	var tabbedBarState = require('./default').parse(node, state);
	code += tabbedBarState.code;

	// Update the parsing state
	return _.extend(tabbedBarState, {code:code}); 
};