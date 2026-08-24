function showPage(page) {
    document.querySelectorAll(".page").forEach(function(p) {
        p.classList.remove("active");
    });

    const selectedPage = document.getElementById(page);

    if (selectedPage) {
        selectedPage.classList.add("active");
    }
}


/* =========================
   COMPILE
========================= */

function compileCode() {

    const code = document.getElementById("code").value;

    if (code.trim() === "") {
        document.getElementById("error").innerText =
            "Error: Please enter a C program.";
        return;
    }

    document.getElementById("error").innerText =
        "Compilation successful.\nNo frontend errors.";

    document.getElementById("output").innerText =
        "Program compiled successfully.\n\nClick Run Code to execute.";
}


/* =========================
   RUN CODE
========================= */

function runCode() {

    const code = document.getElementById("code").value;
    const input = document.getElementById("stdin").value.trim();

    const outputBox = document.getElementById("output");
    const errorBox = document.getElementById("error");

    if (code.trim() === "") {
        errorBox.innerText =
            "Error: Please enter a C program.";
        return;
    }

    try {

        const output = executeCProgram(code, input);

        outputBox.innerText = output;
        errorBox.innerText = "No errors.";

        document.getElementById("historyText").innerText =
            "Program executed successfully.";

    } catch (error) {

        outputBox.innerText = "";

        errorBox.innerText =
            "Error:\n" + error.message;
    }
}


/* =========================
   SIMPLE C PROGRAM EXECUTOR
========================= */

function executeCProgram(code, input) {

    let output = "";

    /* Remove comments */

    code = code.replace(/\/\/.*$/gm, "");
    code = code.replace(/\/\*[\s\S]*?\*\//g, "");


    /* =====================
       INPUT VALUES
    ===================== */

    const inputValues = input
        .split(/\s+/)
        .filter(function(value) {
            return value !== "";
        });

    let inputIndex = 0;

    const variables = {};


    /* =====================
       SCANF
    ===================== */

    const scanfRegex =
        /scanf\s*\(\s*"([\s\S]*?)"\s*,\s*([\s\S]*?)\)\s*;/g;

    let match;

    while ((match = scanfRegex.exec(code)) !== null) {

        const variableList = match[2]
            .replace(/&/g, "")
            .split(",")
            .map(function(variable) {
                return variable.trim();
            });

        variableList.forEach(function(variable) {

            if (inputIndex >= inputValues.length) {
                throw new Error(
                    "Not enough input provided."
                );
            }

            let value = inputValues[inputIndex++];

            if (!isNaN(value)) {
                value = Number(value);
            }

            variables[variable] = value;
        });
    }


    /* =====================
       VARIABLE DECLARATIONS
    ===================== */

    const declarationRegex =
        /\b(?:int|float|double|long)\s+([a-zA-Z_]\w*)\s*(?:=\s*([^;]+))?\s*;/g;

    while ((match = declarationRegex.exec(code)) !== null) {

        const variable = match[1];
        const expression = match[2];

        if (expression !== undefined) {

            variables[variable] =
                evaluateExpression(
                    expression,
                    variables
                );

        } else {

            if (variables[variable] === undefined) {
                variables[variable] = 0;
            }
        }
    }


    /* =====================
       FOR LOOP
    ===================== */

    const forRegex =
        /for\s*\(\s*int\s+(\w+)\s*=\s*(\d+)\s*;\s*\1\s*([<>=!]+)\s*(\d+)\s*;\s*\1\+\+\s*\)\s*\{([\s\S]*?)\}/g;

    while ((match = forRegex.exec(code)) !== null) {

        const variable = match[1];
        const start = Number(match[2]);
        const operator = match[3];
        const end = Number(match[4]);
        const body = match[5];

        variables[variable] = start;

        for (
            let i = start;
            checkCondition(i, operator, end);
            i++
        ) {

            variables[variable] = i;

            output += executePrintStatements(
                body,
                variables
            );
        }
    }


    /* =====================
       WHILE LOOP
    ===================== */

    const whileRegex =
        /while\s*\(\s*(\w+)\s*([<>=!]+)\s*(\d+)\s*\)\s*\{([\s\S]*?)\}/g;

    while ((match = whileRegex.exec(code)) !== null) {

        const variable = match[1];
        const operator = match[2];
        const end = Number(match[3]);
        const body = match[4];

        let safety = 0;

        while (
            checkCondition(
                Number(variables[variable]),
                operator,
                end
            )
        ) {

            output += executePrintStatements(
                body,
                variables
            );

            variables[variable]++;

            safety++;

            if (safety > 10000) {
                break;
            }
        }
    }


    /* =====================
       NORMAL PRINTF
    ===================== */

    const printfRegex =
        /printf\s*\(\s*"([\s\S]*?)"\s*(?:,\s*([\s\S]*?))?\)\s*;/g;

    while ((match = printfRegex.exec(code)) !== null) {

        let text = match[1];
        const args = match[2] || "";

        if (args !== "") {

            const argumentsList = args
                .split(",")
                .map(function(arg) {
                    return arg.trim();
                });

            argumentsList.forEach(function(arg) {

                let value;

                try {

                    value = evaluateExpression(
                        arg,
                        variables
                    );

                } catch (e) {

                    value =
                        variables[arg] !== undefined
                            ? variables[arg]
                            : arg;
                }

                text = text.replace(
                    /%[dfc]/,
                    value
                );
            });
        }

        text = text
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t");

        output += text;
    }


    if (output === "") {

        output =
            "Program executed successfully.\n\n" +
            "No printable output was detected.";
    }

    return output;
}


/* =========================
   PRINT STATEMENTS
========================= */

function executePrintStatements(code, variables) {

    let result = "";

    const regex =
        /printf\s*\(\s*"([\s\S]*?)"\s*(?:,\s*([\s\S]*?))?\)\s*;/g;

    let match;

    while ((match = regex.exec(code)) !== null) {

        let text = match[1];
        const args = match[2] || "";

        if (args !== "") {

            args.split(",").forEach(function(arg) {

                arg = arg.trim();

                let value;

                try {

                    value = evaluateExpression(
                        arg,
                        variables
                    );

                } catch (e) {

                    value =
                        variables[arg] !== undefined
                            ? variables[arg]
                            : arg;
                }

                text = text.replace(
                    /%[dfc]/,
                    value
                );
            });
        }

        text = text
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t");

        result += text;
    }

    return result;
}


/* =========================
   EXPRESSION EVALUATOR
========================= */

function evaluateExpression(expression, variables) {

    expression = expression.trim();

    expression = expression.replace(
        /\b[a-zA-Z_]\w*\b/g,
        function(name) {

            if (
                Object.prototype.hasOwnProperty.call(
                    variables,
                    name
                )
            ) {
                return variables[name];
            }

            return name;
        }
    );

    if (!/^[0-9+\-*/%().\s]+$/.test(expression)) {

        throw new Error(
            "Unsupported C expression: " +
            expression
        );
    }

    return Function(
        '"use strict"; return (' +
        expression +
        ')'
    )();
}


/* =========================
   CONDITIONS
========================= */

function checkCondition(a, operator, b) {

    switch (operator) {

        case "<":
            return a < b;

        case "<=":
            return a <= b;

        case ">":
            return a > b;

        case ">=":
            return a >= b;

        case "==":
            return a == b;

        case "!=":
            return a != b;

        default:
            return false;
    }
}


/* =========================
   CLEAR
========================= */

function clearCode() {

    document.getElementById("code").value = "";

    document.getElementById("stdin").value = "";

    document.getElementById("output").innerText =
        "Ready to execute...";

    document.getElementById("error").innerText =
        "No errors.";
}


/* =========================
   SAVE CODE
========================= */

function saveCode() {

    const code =
        document.getElementById("code").value;

    if (code.trim() === "") {

        alert("Please enter code first.");

        return;
    }

    localStorage.setItem(
        "savedCode",
        code
    );

    alert(
        "Code saved successfully!"
    );
}


/* =========================
   LOAD CODE
========================= */

function loadCode() {

    const code =
        localStorage.getItem("savedCode");

    if (code) {

        document.getElementById("code").value =
            code;

        showPage("editor");

    } else {

        alert(
            "No saved code found."
        );
    }
}
