import React, { useState } from "react";

/* ================= API URL ================= */

const API_URL = "http://192.168.1.16:5000";

/* ================= REQUIRED HR COLUMNS ================= */

const REQUIRED_COLUMNS = [
  "Age",
  "MonthlyIncome",
  "DistanceFromHome",
  "JobSatisfaction",
  "JobInvolvement",
  "WorkLifeBalance",
  "OverTime",
  "YearsAtCompany",
];

export default function Validation() {
  const [csvFile, setCsvFile] = useState(null);
  const [bulkData, setBulkData] = useState(null);
  const [shapData, setShapData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ================= CSV VALIDATION ================= */

  const validateCsv = async (file) => {
    if (!file) {
      return "Please upload a CSV file.";
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return "Only CSV files are allowed.";
    }

    const text = await file.text();

    const lines = text.trim().split(/\r?\n/);

    if (lines.length < 2) {
      return "CSV must contain header and at least one data row.";
    }

    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, ""));

    const missingColumns = REQUIRED_COLUMNS.filter(
      (col) => !headers.includes(col)
    );

    if (missingColumns.length > 0) {
      return `Invalid HR CSV file. Missing columns: ${missingColumns.join(
        ", "
      )}`;
    }

    return null;
  };

  /* ================= PREDICT ================= */

  const handlePredict = async () => {
    if (!csvFile) {
      setError("Please upload a valid HR CSV file.");
      return;
    }

    setLoading(true);
    setError(null);
    setBulkData(null);
    setShapData(null);

    try {
      /* Validate CSV */

      const err = await validateCsv(csvFile);

      if (err) {
        setError(err);
        return;
      }

      /* Create FormData */

      const formData = new FormData();
      formData.append("file", csvFile);

      console.log("Sending CSV to backend...");

      /* IMPORTANT: Correct URL */

      const res = await fetch(`${API_URL}/predict_csv`, {
        method: "POST",
        body: formData,
      });

      console.log("Response status:", res.status);

      const data = await res.json();

      console.log("Backend response:", data);

      /* Backend error */

      if (!res.ok) {
        throw new Error(data.error || "Prediction failed.");
      }

      /* No predictions */

      if (!data.predictions) {
        throw new Error("No predictions returned by backend.");
      }

      /* Save predictions */

      setBulkData(data.predictions);

      console.log(
        "Predictions received:",
        data.predictions
      );
    } catch (err) {
      console.error("Prediction error:", err);

      setError(
        err.message || "Server error while predicting."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= SHAP ================= */

  const handleBulkShap = async () => {
    if (!csvFile) {
      setError("Upload CSV first.");
      return;
    }

    if (shapData) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();

      formData.append("file", csvFile);

      console.log("Sending CSV for SHAP...");

      /* IMPORTANT: Correct URL */

      const res = await fetch(`${API_URL}/shap_global`, {
        method: "POST",
        body: formData,
      });

      console.log(
        "SHAP response status:",
        res.status
      );

      const data = await res.json();

      console.log(
        "SHAP response:",
        data
      );

      if (!res.ok) {
        throw new Error(
          data.error || "SHAP failed."
        );
      }

      if (!Array.isArray(data)) {
        throw new Error(
          "SHAP table not generated."
        );
      }

      setShapData(data);

    } catch (err) {
      console.error(
        "SHAP error:",
        err
      );

      setError(
        err.message || "SHAP failed."
      );

    } finally {
      setLoading(false);
    }
  };

  /* ================= RESET ================= */

  const handleReset = () => {
    setCsvFile(null);
    setBulkData(null);
    setShapData(null);
    setError(null);

    const input =
      document.getElementById("csvInput");

    if (input) {
      input.value = "";
    }
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen p-6">

      {/* HEADER */}

      <h1 className="text-4xl font-extrabold text-indigo-800 mb-6 text-center">
        Fair-ExplainHR Validation
      </h1>

      {/* UPLOAD SECTION */}

      <div className="bg-green-200 p-6 rounded-xl shadow mb-6">

        <input
          id="csvInput"
          type="file"
          accept=".csv"
          onChange={(e) => {
            setCsvFile(
              e.target.files?.[0] || null
            );

            setError(null);
            setBulkData(null);
            setShapData(null);
          }}
        />

        {/* BUTTONS */}

        <div className="mt-4 flex gap-3">

          {/* PREDICT */}

          <button
            onClick={handlePredict}
            disabled={!csvFile || loading}
            className={`px-5 py-2 rounded text-white ${
              csvFile && !loading
                ? "bg-green-600 hover:bg-green-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {loading
              ? "Processing..."
              : "Predict"}
          </button>

          {/* SHAP */}

          <button
            onClick={handleBulkShap}
            disabled={
              !bulkData ||
              shapData ||
              loading
            }
            className="bg-blue-600 disabled:opacity-50 text-white px-5 py-2 rounded hover:bg-blue-700"
          >
            {loading
              ? "Processing..."
              : "Explain with SHAP"}
          </button>

          {/* RESET */}

          <button
            onClick={handleReset}
            disabled={loading}
            className="bg-red-600 disabled:opacity-50 text-white px-5 py-2 rounded hover:bg-red-700"
          >
            Reset
          </button>

        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 p-3 rounded">
            {error}
          </div>
        )}

        {/* FILE NAME */}

        {csvFile && (
          <p className="mt-3 text-gray-700">
            Selected file:{" "}
            <b>{csvFile.name}</b>
          </p>
        )}

      </div>

      {/* MAIN GRID */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ================= PREDICTIONS ================= */}

        <div className="bg-white p-6 rounded-xl shadow border">

          <h2 className="text-xl font-semibold mb-4">
            📊 Predictions
          </h2>

          {bulkData &&
          bulkData.length > 0 ? (

            <div className="overflow-x-auto">

              <table className="min-w-full border">

                <thead className="bg-blue-100">

                  <tr>

                    <th className="p-3 border">
                      Employee ID
                    </th>

                    <th className="p-3 border">
                      Prediction
                    </th>

                    <th className="p-3 border">
                      Probability
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {bulkData.map(
                    (row, i) => (

                      <tr
                        key={i}
                        className="hover:bg-gray-50"
                      >

                        <td className="p-3 border">
                          {row.Employee_ID}
                        </td>

                        <td className="p-3 border">
                          {row.Prediction}
                        </td>

                        <td className="p-3 border">

                          {(Number(
                            row.Probability
                          ) * 100).toFixed(2)}
                          %

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          ) : (

            <p className="text-gray-500">
              Upload valid HR CSV and click
              <b> Predict</b>.
            </p>

          )}

        </div>

        {/* ================= SHAP ================= */}

        <div className="bg-white p-6 rounded-xl shadow border">

          <h2 className="text-xl font-semibold mb-4">
            🔍 SHAP Feature Importance
          </h2>

          {shapData &&
          shapData.length > 0 ? (

            <div className="overflow-y-auto max-h-[500px]">

              <table className="min-w-full border">

                <thead className="bg-indigo-100 sticky top-0">

                  <tr>

                    <th className="p-2 border text-left">
                      Feature
                    </th>

                    <th className="p-2 border text-right">
                      Mean |SHAP|
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {shapData.map(
                    (row, i) => (

                      <tr
                        key={i}
                        className="hover:bg-gray-50"
                      >

                        <td className="p-2 border">
                          {row.feature}
                        </td>

                        <td className="p-2 border text-right">
                          {row.importance}
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          ) : (

            <p className="text-gray-500">
              Click <b>Explain with SHAP</b>{" "}
              to view feature importance.
            </p>

          )}

        </div>

      </div>

    </div>
  );
}