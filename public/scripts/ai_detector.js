const API_URL = "https://scratch-ai-detector.vercel.app/";

const uploadBtn = document.querySelector("#project-upload");
const loadBtn = document.querySelector("#project-load");
const linkInput = document.querySelector("#project-link");
const output = document.querySelector("#score-result");

const pieSlice = document.querySelector("#pie-slice");
const scoreFraction = document.querySelector("#score-fraction");
const verdict = document.querySelector("#verdict");

const setBusy = (busy) => {
    uploadBtn.disabled = busy;
    loadBtn.disabled = busy;
};

const showError = (error) => {
    console.error(error);
    output.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
};

const resetResults = () => {
    pieSlice.style.setProperty("--percent", 0);
    pieSlice.style.setProperty("--color", "green");
    pieSlice.classList.remove("negative");

    scoreFraction.textContent = "0 / 0 ACS";
    verdict.textContent = "Waiting...";
};

const outputResults = (result) => {
    const bandMap = {
        "Likely AI": "red",
        Suspicious: "yellow",
        Inconclusive: "gray",
        "Likely human": "green",
    };

    console.log(result);

    const percent = (result["units"] / result["measurable_units"]) * 100;
    pieSlice.style.setProperty("--percent", Math.abs(percent));
    pieSlice.classList.toggle("negative", percent < 0);
    pieSlice.style.setProperty("--color", bandMap[result["band"]]);

    scoreFraction.textContent = `${result["units"]} / ${result["measurable_units"]} ACS`;
    verdict.textContent = result["band"];
};

const scoreProject = async (payload) => {
    const body = JSON.stringify(payload);
    const bodySize = new TextEncoder().encode(body).byteLength;

    // leave room under typical serverless request-body limits
    if (bodySize > 4 * 1024 * 1024)
        throw new Error(
            "Upload is too large for the API. Try loading it by a Scratch project link instead.",
        );

    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
    });

    let data;
    try {
        data = await response.json();
    } catch {
        throw new Error(
            `API returned an invalid response (HTTP ${response.status}).`,
        );
    }

    if (!response.ok)
        throw new Error(
            data.error || `API request failed (HTTP ${response.status}).`,
        );

    if (!data.result) throw new Error("API response did not contain a score.");

    outputResults(data.result); // temporary for now, will add detailed logging later
};

const processSb3 = async (file) => {
    if (typeof JSZip === "undefined") {
        throw new Error("JSZip is not loaded.");
    }

    const zip = await JSZip.loadAsync(file);
    const projectFile = zip.file("project.json");

    if (!projectFile) {
        throw new Error("Invalid SB3 file: project.json not found.");
    }

    const project = JSON.parse(await projectFile.async("string"));
    if (!project || typeof project !== "object" || Array.isArray(project)) {
        throw new Error("project.json must contain a JSON object.");
    }

    const assets = {};
    for (const entry of Object.values(zip.files)) {
        if (!entry.dir && entry.name !== "project.json") {
            assets[entry.name] = await entry.async("base64");
        }
    }

    return { project, assets };
};

const openFileDialog = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".sb3";

    input.addEventListener(
        "change",
        async () => {
            const file = input.files?.[0];
            input.remove();
            if (!file) return;

            setBusy(true);
            output.textContent = `Reading ${file.name}...`;
            resetResults();

            try {
                output.textContent = "Scoring project..."
                const payload = await processSb3(file);
                await scoreProject(payload);
            } catch (error) {
                showError(error);
            } finally {
                setBusy(false);
            }
        },
        { once: true },
    );

    input.click();
};

const getScratchProjectId = (value) => {
    const input = value.trim();
    if (/^\d+$/.test(input)) return input;

    // bunch of validation checks
    let url;
    try {
        url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    } catch {
        throw new Error("Enter a Scratch project ID or project link.");
    }

    if (!["scratch.mit.edu", "www.scratch.mit.edu"].includes(url.hostname)) {
        throw new Error("The link must be a Scratch project link.");
    }

    const match = url.pathname.match(/^\/projects\/(\d+)(?:\/editor)?\/?$/);
    if (!match) {
        throw new Error("Could not find a project ID in that Scratch link.");
    }

    return match[1];
};

uploadBtn.addEventListener("click", openFileDialog);

loadBtn.addEventListener("click", async () => {
    setBusy(true);
    output.textContent = "Loading project...";
    resetResults();

    try {
        const project_id = getScratchProjectId(linkInput.value);
        output.textContent = "Scoring project...";
        await scoreProject({ project_id });
    } catch (error) {
        showError(error);
    } finally {
        setBusy(false);
    }
});
