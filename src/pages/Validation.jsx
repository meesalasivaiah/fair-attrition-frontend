import react from "react";
import  { useState } from "react";

/* ================= BACKEND URL ================= */

const API_URL = "https://fair-attrition-backend1.onrender.com";


/* ================= REQUIRED HR COLUMNS ================= */

const REQUIRED_COLUMNS = [
  "Age",
  "MonthlyIncome",
  "DistanceFromHome",
  "JobSatisfaction",
  "JobInvolvement",
  "WorkLifeBalance",
  "OverTime",
  "YearsAtCompany"
];


export default function Validation() {

  const [csvFile, setCsvFile] = useState(null);
  const [bulkData, setBulkData] = useState(null);
  const [shapData, setShapData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const [error, setError] = useState(null);


  /* =====================================================
     CSV VALIDATION
  ===================================================== */

  const validateCsv = async (file) => {

    if (!file) {
      return "Please upload a CSV file.";
    }


    if (!file.name.toLowerCase().endsWith(".csv")) {
      return "Only CSV files are allowed.";
    }


    const text = await file.text();

    const lines = text
      .trim()
      .split(/\r?\n/);


    if (lines.length < 2) {
      return "CSV must contain header and at least one data row.";
    }


    const headers = lines[0]
      .split(",")
      .map((h) => h.trim());


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


  /* =====================================================
     PREDICT CSV
  ===================================================== */

  const handlePredict = async () => {

    if (!csvFile) {

      setError("Please upload a valid HR CSV file.");

      return;
    }


    setLoading(true);
    setLoadingMessage(
      "Processing CSV and loading ML models. This may take a little time..."
    );

    setError(null);

    setBulkData(null);
    setShapData(null);


    try {

      /* -----------------------------
         Validate CSV
      ----------------------------- */

      const validationError =
        await validateCsv(csvFile);


      if (validationError) {

        setError(validationError);

        setLoading(false);
        setLoadingMessage("");

        return;
      }


      /* -----------------------------
         FormData
      ----------------------------- */

      const formData = new FormData();

      formData.append(
        "file",
        csvFile
      );


      /* -----------------------------
         API Request
      ----------------------------- */

      const res = await fetch(
        `${API_URL}/predict_csv`,
        {
          method: "POST",
          body: formData
        }
      );


      /* -----------------------------
         Read response
      ----------------------------- */

      const data = await res.json();


      if (!res.ok) {

        throw new Error(
          data.error ||
          "Prediction failed."
        );
      }


      if (
        !data.predictions ||
        !Array.isArray(data.predictions)
      ) {

        throw new Error(
          "Invalid prediction response from server."
        );
      }


      setBulkData(
        data.predictions
      );


    } catch (err) {

      console.error(
        "Prediction error:",
        err
      );


      setError(
        err.message ||
        "Server error while predicting."
      );


    } finally {

      setLoading(false);
      setLoadingMessage("");
    }
  };


  /* =====================================================
     SHAP
  ===================================================== */

  const handleBulkShap = async () => {

    if (!csvFile) {

      setError(
        "Upload CSV first."
      );

      return;
    }


    if (!bulkData) {

      setError(
        "Please run prediction first."
      );

      return;
    }


    if (shapData) {
      return;
    }


    setLoading(true);

    setLoadingMessage(
      "Generating SHAP feature importance. This may take some time..."
    );

    setError(null);


    try {

      /* -----------------------------
         FormData
      ----------------------------- */

      const formData = new FormData();

      formData.append(
        "file",
        csvFile
      );


      /* -----------------------------
         SHAP API
      ----------------------------- */

      const res = await fetch(
        `${API_URL}/shap_global`,
        {
          method: "POST",
          body: formData
        }
      );


      const data = await res.json();


      if (!res.ok) {

        throw new Error(
          data.error ||
          "SHAP generation failed."
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
        err.message ||
        "SHAP failed."
      );


    } finally {

      setLoading(false);
      setLoadingMessage("");
    }
  };


  /* =====================================================
     RESET
  ===================================================== */

  const handleReset = () => {

    setCsvFile(null);

    setBulkData(null);

    setShapData(null);

    setError(null);

    setLoading(false);

    setLoadingMessage("");


    const input =
      document.getElementById(
        "csvInput"
      );


    if (input) {
      input.value = "";
    }
  };


  /* =====================================================
     FILE SELECT
  ===================================================== */

  const handleFileChange = (e) => {

    const file =
      e.target.files?.[0];


    setCsvFile(file || null);

    setBulkData(null);

    setShapData(null);

    setError(null);
  };


  /* =====================================================
     UI
  ===================================================== */

  return (

    <div className="min-h-screen p-6">

      {/* ================================================
          TITLE
      ================================================= */}

      <h1 className="text-4xl font-extrabold text-indigo-800 mb-6 text-center">

        Fair-ExplainHR Validation

      </h1>


      {/* ================================================
          UPLOAD SECTION
      ================================================= */}

      <div className="bg-green-200 p-6 rounded-xl shadow mb-6">

        <input
          id="csvInput"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
        />


        {/* Selected file */}

        {csvFile && (

          <p className="mt-3 text-gray-700">

            Selected file:
            <b className="ml-1">
              {csvFile.name}
            </b>

          </p>

        )}


        {/* ============================================
            BUTTONS
        ============================================= */}

        <div className="mt-4 flex gap-3 flex-wrap">

          {/* Predict */}

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
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded"
          >

            {loading
              ? "Please wait..."
              : "Explain with SHAP"}

          </button>


          {/* Reset */}

          <button
            onClick={handleReset}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-5 py-2 rounded"
          >

            Reset

          </button>

        </div>


        {/* ============================================
            LOADING MESSAGE
        ============================================= */}

        {loading && (

          <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded">

            <p className="text-blue-800 font-medium">

              ⏳ {loadingMessage}

            </p>

            <p className="text-sm text-blue-700 mt-1">

              The first request may take longer because the
              backend loads the ML models.

            </p>

          </div>

        )}


        {/* ============================================
            ERROR
        ============================================= */}

        {error && (

          <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded">

            <p className="text-red-700">

              ❌ {error}

            </p>

          </div>

        )}

      </div>


      {/* ================================================
          MAIN GRID
      ================================================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">


        {/* ==============================================
            PREDICTIONS
        ================================================ */}

        <div className="bg-white p-6 rounded-xl shadow border">

          <h2 className="text-xl font-semibold mb-4">

            📊 Predictions

          </h2>


          {bulkData ? (

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
                          {row.Probability}
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          ) : (

            <p className="text-gray-500">

              Upload a valid HR CSV and click
              <b> Predict</b>.

            </p>

          )}

        </div>


        {/* ==============================================
            SHAP
        ================================================ */}

        <div className="bg-white p-6 rounded-xl shadow border">

          <h2 className="text-xl font-semibold mb-4">

            🔍 SHAP Feature Importance

          </h2>


          {shapData ? (

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

              Click
              <b> Explain with SHAP </b>
              to view feature importance.

            </p>

          )}

        </div>

      </div>

    </div>
  );
}