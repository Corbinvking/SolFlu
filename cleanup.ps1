# Clean scripts directory
$scriptsToRemove = @(
    "environmental_layer_generator",
    "outlier_detection",
    "bayes_factor_test"
)

foreach ($dir in $scriptsToRemove) {
    Remove-Item -Recurse -Force "scripts/$dir" -ErrorAction SilentlyContinue
}

# Clean input/output data while preserving structure
Get-ChildItem -Path "inputdata" -Exclude ".gitkeep" | Remove-Item -Recurse -Force
Get-ChildItem -Path "outputdata" -Exclude ".gitkeep" | Remove-Item -Recurse -Force 