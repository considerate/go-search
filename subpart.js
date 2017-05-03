
module.exports = {
	f: 
		function getStringParts(name) {
			const parts = [];
			const camelCase = new RegExp('([A-Z]{2,}|[a-z][A-Z])', 'g');
			let index = 0;
			let found = false;
			do {
				found = false;
				let info = camelCase.exec(name);
				if(info !== null) {
					found = true;
					parts.push(name.substring(index, camelCase.lastIndex - 1).toLowerCase());
					index = camelCase.lastIndex - 1;
					
				}
			}
			while(found);
			parts.push(name.substr(index, name.length).toLowerCase());
			return parts;
		}
};