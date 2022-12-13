from TreeParser import *
from continuousMCCTreeParser import *
from geojsonLayer import *


def processContinuousMCCTree(tree, date, location):
    print("Processing, please wait...")
    tree_path = '../' + tree
    parsed_tree = parseTree(tree_path)
    tree_info = parseContinuousMCCTree(parsed_tree, date, location)
    geojson_output = createGeojsonLayer(parsed_tree, tree_info)
    output_name = tree + '.output.geojson'
    output_path = '../' + output_name
    with open(output_path, 'w') as f:
        geojson.dump(geojson_output, f)
    print('The result was successfully stored as "' + output_name + '" in your directory!')
