Directory structure:
└── GuyBaele-SpreadGL
    ├── index.html
    ├── scripts
    │   ├── environmental_layer_generator
    │   │   ├── __init__.py
    │   │   ├── raster.py
    │   │   └── regions.py
    │   ├── outlier_detection
    │   │   ├── __init__.py
    │   │   └── trimming.py
    │   ├── spatial_layer_generator
    │   │   ├── time_conversion.py
    │   │   ├── spread.py
    │   │   ├── branch_processor.py
    │   │   ├── __init__.py
    │   │   ├── discrete_space_processor.py
    │   │   └── continuous_space_processor.py
    │   ├── requirements.txt
    │   ├── setup.py
    │   ├── bayes_factor_test
    │   │   ├── __init__.py
    │   │   └── rates.py
    │   ├── README.md
    │   └── projection_transformation
    │       ├── __init__.py
    │       └── reprojection.py
    ├── shared-webpack-configuration.js
    ├── log.js
    ├── inputdata
    │   ├── Rabies_virus_RABV_in_the_United_States
    │   │   └── RABV_US1_gamma_MCC.tree
    │   ├── SARS-CoV-2_lineage_B.1.1.7_VOC_Alpha_in_England
    │   │   ├── B.1.1.7_England.single.tree
    │   │   ├── TreeTime_270221.csv
    │   │   └── README.md
    │   ├── Yellow_fever_virus_YFV_in_Brazil
    │   │   ├── YFV.MCC.tree
    │   │   ├── geoBoundaries-BRA-ADM1.geojson
    │   │   └── Involved_brazilian_states.txt
    │   ├── SARS-CoV-2_lineage_A.27_Worldwide
    │   │   ├── A.27_worldwide.MCC.tree
    │   │   ├── A.27_worldwide.BEAST.log.zip
    │   │   └── A.27_worldwide_location_list.csv
    │   └── Porcine_epidemic_diarrhea_virus_PEDV_in_China
    │       ├── PEDV_China.MCC.tree
    │       ├── Environmental_variables.csv
    │       ├── Involved_provincial_capital_coordinates.csv
    │       └── China_map.geojson
    ├── outputdata
    │   ├── Rabies_virus_RABV_in_the_United_States
    │   │   └── RABV_US1_gamma_MCC.tree.output.geojson
    │   ├── SARS-CoV-2_lineage_B.1.1.7_VOC_Alpha_in_England
    │   │   ├── B.1.1.7_England.single.tree.output.reprojected.csv
    │   │   ├── B.1.1.7_England.single.tree.output.reprojected.cleaned.csv
    │   │   └── B.1.1.7_England.single.tree.output.csv
    │   ├── Yellow_fever_virus_YFV_in_Brazil
    │   │   ├── brazil_region_maxtemp.csv
    │   │   └── YFV.MCC.tree.output.geojson
    │   ├── SARS-CoV-2_lineage_A.27_Worldwide
    │   │   ├── Bayes.factors.added.A.27_worldwide.MCC.tree.output.csv
    │   │   ├── A.27_worldwide.MCC.tree.output.csv
    │   │   └── Bayes.factor.test.result.csv
    │   └── Porcine_epidemic_diarrhea_virus_PEDV_in_China
    │       ├── PEDV_China.MCC.tree.output.geojson
    │       └── Environmental_data_layer.geojson
    ├── package.json
    ├── .babelrc
    ├── html
    │   ├── PEDV_China.MCC.tree.output.html
    │   ├── RABV_US1_gamma_MCC.tree.output.html
    │   ├── B.1.1.7_England.single.tree.output.reprojected.cleaned.html
    │   ├── YFV.MCC.tree.output.html
    │   └── A.27_worldwide.MCC.tree.output.html
    ├── webpack.config.js
    ├── python3.12.4
    │   ├── requirements.txt
    │   └── README.md
    ├── README.md
    └── src
        ├── components
        │   ├── banner.js
        │   ├── announcement.js
        │   ├── map-control
        │   │   └── map-control.js
        │   └── load-data-modal
        │       ├── sample-maps-tab.js
        │       ├── load-remote-map.js
        │       └── sample-data-viewer.js
        ├── data
        │   ├── sample-gps-data.js
        │   ├── sample-hex-id-csv.js
        │   ├── sample-small-geojson.js
        │   ├── sample-trip-data.js
        │   ├── sample-animate-trip-data.js
        │   ├── sample-geojson-points.js
        │   ├── sample-s2-data.js
        │   ├── sample-icon-csv.js
        │   └── sample-geojson-config.js
        ├── reducers
        │   └── index.js
        ├── constants
        │   ├── localization.js
        │   └── default-settings.js
        ├── main.js
        ├── app.js
        ├── factories
        │   ├── load-data-modal.js
        │   ├── map-control.js
        │   └── panel-header.js
        ├── cloud-providers
        │   ├── dropbox
        │   │   ├── dropbox-error-modal.js
        │   │   ├── dropbox-provider.js
        │   │   └── dropbox-icon.js
        │   ├── carto
        │   │   ├── carto-provider.js
        │   │   └── carto-icon.js
        │   ├── foursquare
        │   │   ├── foursquare-icon.js
        │   │   └── foursquare-provider.js
        │   └── index.js
        ├── utils
        │   ├── url.js
        │   ├── routes.js
        │   └── strings.js
        ├── store.js
        └── actions.js
