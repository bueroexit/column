/* Column v1.0
 *
 * Copyright (c) 2011 Martijn W. van der Lee
 * Licensed under the MIT.
 *
 * Emulate CSS3 style column on browsers that don't support it.
 */
 
// also see: http://welcome.totheinter.net/2008/07/22/multi-column-layout-with-css-and-jquery/
 
//TODO Split on hyphens, &shy;, and others.
//TODO Configurable splitter, using regex patterns. ('syllables', 'words', 'sentences', 'punctuation', function)
//TODO Add classes to different columns; 'column', 'last-column', 'first-column', use inner-div's so stuff can be layed out with CSS.
//TODO Accept "em" as measurement. Also other measurements: px, % (why?), in, mm(=in), cm(=cm), ex, pt(=in), pc(=in)
//TODO Iterative balancing

//TODO Just do this inside the strategies; not worth the namespace polution.
if (String.prototype.indexOfRegExp == null) {
	String.prototype.indexOfRegExp = function(pattern, modifiers) {
		var re = new RegExp(pattern, modifiers);	// cached?
		var m = re.exec(this.valueOf());	
		return (m == null? -1 : m.index);
	}
}

(function( $ ){
	$.fn.column = function(options) {
		var settings = {
			'width':		'auto',
			'count':		'auto',
			'gap':			'normal',
			'rule_color':	'',
			'rule_style':	'none',
			'rule_width':	'medium',
			'split':		'word'	
		};
		
		var border_widths	= {	thin:	_measure_border_width('thin'),
								medium: _measure_border_width('medium'),
								thick:	_measure_border_width('thick')
							};		
		
		function _measure_em(scope) {
			var element = jQuery('<div style="display:none;height:10em;margin:0;padding:0;border:0;"></div>').appendTo(scope);
			var px = element.height() / 10;
			element.remove();
			return px;
		}

		function _measure_border_width(type) {
			var element = jQuery('<div style="border:'+type+' solid transparent;height:0px;"></div>').appendTo('body');
			var width = element.outerHeight() / 2;
			element.remove();
			return width;
		}

		var split_strategies = {
			word: 		function(node) {
							var contents = new Array;
							do {
								contents.push(node);
								if (split = node.nodeValue.indexOfRegExp('\\s+') + 1) {
									node = node.splitText(split);
								}
							} while (split);
							return contents;			
						},
			sentence: 	function(node) {
							var contents = new Array;
							do {
								contents.push(node);
								if (split = node.nodeValue.indexOfRegExp('[.:!?]+') + 1) {
									node = node.splitText(split);
								}
							} while (split);
							return contents;			
						}
		}
		
		function _split(parent) {
			var contents = new Array;
			$(parent).contents().each( function(index, value) {
				if (value.nodeType == 3) {						// Node.TEXT_NODE
					contents = contents.concat(split_strategies[settings.split](value));
				} else {
					contents.push(value);
				}
			});			
			return contents;			
		}
				
		return this.each( function() {
			// Merge options
			if (options) { 
				$.extend(settings, options);
			}			
			
			// per-instance settings
			var element			= this;
			var content			= $(this).html();	// entire bulk
			var contents		= _split(this);
			var gap_normal		= _measure_em(this);						
			
			// the active part
			_resize();	// do once pre-load so we atleast have columns
			$(window).resize(_resize).load(_resize);
			
			// worker
			function _resize() {
				// Clear columns
				$(element).empty();
			
				if (settings.width != 'auto') {
					var column_count = Math.floor($(element).width() / settings.width);
				} else if (settings.count != 'auto') {
					var column_count = settings.count;
				} else {
					return;
				}
				
				var column_gap		= (settings.gap == parseFloat(settings.gap))? settings.gap : gap_normal;								
				var width			= $(element).width() - ((column_count - 1) * column_gap);
				var column_width	= Math.floor(width / column_count);
												
				if (settings.rule_style != 'none') {
					var rule_color = (settings.rule_color? settings.rule_color : $(element).css('color'));
					var rule_width = (settings.rule_width == parseFloat(settings.rule_width)? settings.rule_width : border_widths[settings.rule_width]);				
					column_gap		-= rule_width;
				}
				
				// Setup columns
				var left = 0;
				for (var c = 0; c < column_count; ++c) {
					var style	= 'position:absolute;'
								+ (c > 0?				 'left:'+left+'px;' : '')
								+ 'width:'+column_width+'px;'
								+ (c > 0?				 'padding-left:'+(column_gap / 2)+'px;' : '')
								+ (c < column_count - 1? 'padding-right:'+(column_gap / 2)+'px;' : '')
								;
					left += column_width;
					left += column_gap;
					if (c > 0 && settings.rule_style != 'none') {
						style	+= 'border-left:'+rule_width+'px '+settings.rule_style+' '+rule_color+';';
						left	+= rule_width;
					}
					$(element).append('<div style="'+style+'"></div>');
				}							
				
				// Determine height of total content in a single column
				var first = $('div', element).first();
				var height = first.html(content).height();
				first.empty();
				var height_step = Math.ceil(height / column_count);
				
				// Fill columns
				var contents_length = contents.length;
				var max_height = 0;
				var i = 0;
				for (var c = 0; c < column_count; ++c) {
					var div = $('div', element).eq(c);
					
					if (c < column_count - 1) {
						// detect overflow
						while (i < contents_length && div.height() <= height_step) {
							div.append(contents[i++]);
						}
						
						// fill up rest of div
						var div_height = div.height();					
						while (i < contents_length && div.height() == div_height) {
							div.append(contents[i++]);
						}
					
						// retract last part of content
						div.contents().last().remove();
						--i;
					} else {
						// dump remaining content in the last column
						while (i < contents_length) {
							div.append(contents[i++]);
						}
					}
					
					max_height = Math.max(max_height, div.height());
				}
				
				// Set all to the same height
				$('div', element).css('height', max_height);
				$(element).css('height', max_height);
			}		
		});
	};
})( jQuery );