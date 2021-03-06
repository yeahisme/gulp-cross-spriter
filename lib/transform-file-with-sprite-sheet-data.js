var path = require('path');
var extend = require('extend');
var css = require('css');

var spriterUtil = require('./spriter-util');
var mapOverStylesAndTransformBackgroundImageDeclarations = require('./map-over-styles-and-transform-background-image-declarations');

var backgroundURLMatchAllRegex = new RegExp(spriterUtil.backgroundURLRegex.source, "gi");

var chunkFile;

// Replace all the paths that need replacing
function transformFileWithSpriteSheetData(vinylFile, coordinateMap, spriteKey, pathToSpriteSheetFromCSS, absolutePathToSpriteSheetFromCSS, /*optional*/ includeMode, /*optional*/ isSilent, /*optional*/ outputIndent) {

    if (!chunkFile) chunkFile = vinylFile;


    includeMode = includeMode ? includeMode : 'implicit';
    isSilent = (isSilent !== undefined) ? isSilent : false;
    outputIndent = outputIndent ? outputIndent : '\t';

    var sKey = absolutePathToSpriteSheetFromCSS.sKey;
    var absolutePath = absolutePathToSpriteSheetFromCSS.absolutePath;
    if (!!absolutePath) {
        absolutePath = absolutePath.substr(-1, 1) == '/' ? absolutePath : absolutePath + '/';
    }
    var specialPath = absolutePathToSpriteSheetFromCSS.specialPath;
    for (var i in specialPath) {
        specialPath[i] = specialPath[i].substr(-1, 1) == '/' ? specialPath[i] : specialPath[i] + '/';
    }
    // Clone the declartion to keep it immutable
    // var resultantFile = vinylFile.clone();
    for (var key in chunkFile) {
        resultantFile = chunkFile[key];
        rslFile(resultantFile, key);
    }

    function rslFile(resultantFile, key) {

        var styles = css.parse(String(resultantFile.contents), {
            'silent': isSilent,
            'source': resultantFile.path
        });

        styles = mapOverStylesAndTransformBackgroundImageDeclarations(styles, includeMode, function(declaration) {
            var coordList = [];
            // console.info(declaration.value);
            declaration.value = spriterUtil.matchBackgroundImages(declaration.value, function(imagePath) {

                var coords = coordinateMap[path.join(path.dirname(resultantFile.path), imagePath)];
                // Make sure there are coords for this image in the sprite sheet, otherwise we won't include it
                if (coords) {
                    coordList.push("-" + coords.x + "px -" + coords.y + "px");

                    // If there are coords in the spritemap for this image, lets use the spritemap
                    if (sKey) {
                        if (Object.keys(specialPath).length > 0 && specialPath[spriteKey.split('.')[0]]) {
                            return specialPath[spriteKey.split('.')[0]] + spriteKey;
                        } else if (!!absolutePath) {
                            return absolutePath + spriteKey;
                        }
                    }
                    return pathToSpriteSheetFromCSS;
                }

                return imagePath;
            });

            return {
                'value': declaration,
                /* */
                // Add the appropriate background position according to the spritemap
                'insertElements': (function() {
                        if (coordList.length > 0) {
                            return {
                                type: 'declaration',
                                property: 'background-position',
                                value: coordList.join(', ')
                            };
                        }
                    })()
                    /* */
            };
        });

        // Put it back into string form
        var resultantContents = css.stringify(styles, {
            indent: outputIndent
        });

        resultantFile.contents = new Buffer(resultantContents);
        chunkFile[key] = resultantFile;
    }

    return chunkFile;
}

module.exports = transformFileWithSpriteSheetData;
