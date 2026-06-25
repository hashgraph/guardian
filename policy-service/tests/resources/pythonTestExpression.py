import json
import math
import datetime
import calendar
import uuid
from collections import Counter

import numpy as np
import pandas as pd
import scipy.stats as stats
import scipy.optimize as opt
import sympy as sp
import statsmodels.api as sm
import networkx as nx
from sklearn.linear_model import LinearRegression
import xarray as xr
from pint import UnitRegistry
import cftime
from astropy import units as u
from astropy.constants import c as speed_of_light


# --- numpy: array statistics ---
emissions = np.array([120.5, 200.1, 75.0, 340.8, 88.4, 150.2])
numpy_stats = {
    'mean': float(np.mean(emissions)),
    'std': float(np.std(emissions)),
    'percentile_95': float(np.percentile(emissions, 95)),
}

# --- scipy: statistical test + optimization ---
t_stat, p_value = stats.ttest_1samp(emissions, 150.0)
minimum_x = opt.minimize_scalar(lambda x: (x - 3.7) ** 2 + 5).x
scipy_stats = {
    't_statistic': float(t_stat),
    'p_value': float(p_value),
    'minimum_x': float(minimum_x),
}

# --- sympy: symbolic integration & equation solving ---
x = sp.Symbol('x')
integral = sp.integrate(x ** 2 + 2 * x + 1, x)
roots = sp.solve(x ** 2 - 5 * x + 6, x)
sympy_results = {
    'integral': str(integral),
    'quadratic_roots': [str(r) for r in roots],
}

# --- pandas: dataframe pipeline ---
df = pd.DataFrame({
    'project': ['A', 'B', 'C', 'D'],
    'emission_kg': [120.5, 200.1, 75.0, 340.8],
    'energy_kwh': [500, 800, 300, 1400],
})
df['intensity'] = df['emission_kg'] / df['energy_kwh']
pandas_results = {
    'total_emissions_kg': float(df['emission_kg'].sum()),
    'avg_intensity': float(df['intensity'].mean()),
    'top_project': df.loc[df['emission_kg'].idxmax(), 'project'],
}

# --- pint: unit conversion ---
ureg = UnitRegistry()
total_kg = df['emission_kg'].sum() * ureg.kilogram
pint_results = {
    'total_tonnes': float(total_kg.to(ureg.metric_ton).magnitude),
    'total_pounds': float(total_kg.to(ureg.pound).magnitude),
}

# --- astropy: physical units & constants ---
distance_m = (3.0 * u.km).to(u.m).value
astropy_results = {
    'distance_3km_in_meters': float(distance_m),
    'speed_of_light_m_per_s': float(speed_of_light.value),
}

# --- statsmodels: OLS regression ---
X = sm.add_constant(df['energy_kwh'].values.astype(float))
ols = sm.OLS(df['emission_kg'].values.astype(float), X).fit()
statsmodels_results = {
    'r_squared': float(ols.rsquared),
    'slope': float(ols.params[1]),
}

# --- networkx: graph metrics ---
graph = nx.Graph()
graph.add_edges_from([('A', 'B'), ('B', 'C'), ('C', 'D'), ('A', 'D'), ('B', 'D')])
networkx_results = {
    'nodes': graph.number_of_nodes(),
    'edges': graph.number_of_edges(),
    'density': float(nx.density(graph)),
}

# --- scikit-learn: linear regression ---
lr = LinearRegression().fit(
    df['energy_kwh'].values.reshape(-1, 1),
    df['emission_kg'].values,
)
sklearn_results = {
    'coef': float(lr.coef_[0]),
    'intercept': float(lr.intercept_),
}

# --- xarray: labeled n-dim array ---
da = xr.DataArray(
    np.array([[1.0, 2.0], [3.0, 4.0]]),
    dims=('region', 'year'),
    coords={'region': ['EU', 'US'], 'year': [2024, 2025]},
)
xarray_results = {
    'mean_by_region': {k: float(v) for k, v in da.mean(dim='year').to_pandas().items()},
}

# --- cftime: calendar-aware dates ---
cftime_results = {
    'noleap_date': str(cftime.DatetimeNoLeap(2026, 2, 28)),
}

# --- built-ins ---
doc_type_counts = Counter(['cert', 'cert', 'audit', 'cert', 'audit'])
builtins_results = {
    'most_common_doc_type': doc_type_counts.most_common(1)[0][0],
    'days_in_feb_2026': calendar.monthrange(2026, 2)[1],
    'log_pi': math.log(math.pi),
}

# --- Docker-only libraries (optional) ---
docker_only = {}
try:
    import rasterio  # noqa: F401
    docker_only['rasterio'] = rasterio.__version__
except ImportError:
    docker_only['rasterio'] = None
try:
    import rioxarray  # noqa: F401
    docker_only['rioxarray'] = rioxarray.__version__
except ImportError:
    docker_only['rioxarray'] = None

# --- Source document echo (if upstream block produced one) ---
source_credential_subject = None
if documents:
    first = documents[0]
    cs = first.get('document', {}).get('credentialSubject', [])
    if cs:
        source_credential_subject = cs[0]

# --- Build the output JSON document ---
output_document = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    'id': f'urn:uuid:{uuid.uuid4()}',
    'type': ['PythonComputationReport'],
    'generatedAt': datetime.datetime.now(datetime.UTC).isoformat(),
    'runtime': {
        'engine': 'pyodide' if docker_only['rasterio'] is None else 'docker',
        'pythonVersion': '3.12',
    },
    'summary': {
        'totalEmissionsKg': pandas_results['total_emissions_kg'],
        'totalEmissionsTonnes': pint_results['total_tonnes'],
        'averageIntensity': pandas_results['avg_intensity'],
        'topProject': pandas_results['top_project'],
        'regressionRSquared': statsmodels_results['r_squared'],
    },
    'analyses': {
        'numpy': numpy_stats,
        'scipy': scipy_stats,
        'sympy': sympy_results,
        'pandas': pandas_results,
        'pint': pint_results,
        'astropy': astropy_results,
        'statsmodels': statsmodels_results,
        'networkx': networkx_results,
        'sklearn': sklearn_results,
        'xarray': xarray_results,
        'cftime': cftime_results,
        'builtins': builtins_results,
        'dockerOnly': docker_only,
    },
    'source': source_credential_subject,
}

# --- Emit ---
debug(output_document)
done(output_document)
