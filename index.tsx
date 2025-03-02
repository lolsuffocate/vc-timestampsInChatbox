/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { findByCodeLazy, findLazy } from "@webpack";
import { Menu, moment, Popout, React, TooltipContainer } from "@webpack/common";

type TimeFormatsType = {
    /** Format as "00:00" */
    t: (m: typeof moment | Date | number) => string;
    /** Format as "00:00:00" */
    T: (m: typeof moment | Date | number) => string;
    /** Format as "01/01/2025" */
    d: (m: typeof moment | Date | number) => string;
    /** Format as "01 January 2025" */
    D: (m: typeof moment | Date | number) => string;
    /** Format as "01 January 2025 00:00" */
    f: (m: typeof moment | Date | number) => string;
    /** Format as "Wednesday, 1 January 2025 00:00" */
    F: (m: typeof moment | Date | number) => string;
    /** Format as relative time (e.g. "2 months ago") */
    R: (m: typeof moment) => string;
};

/**
 * Time formats for timestamps
 * @property t - Format as "00:00"
 * @property T - Format as "00:00:00"
 * @property d - Format as "01/01/2025"
 * @property D - Format as "01 January 2025"
 * @property f - Format as "01 January 2025 00:00"
 * @property F - Format as "Wednesday, 1 January 2025 00:00"
 * @property R - Format as relative time (e.g. "2 months ago")
 */
const TimeFormats: TimeFormatsType = findLazy(m => m?.D && m?.F && m?.d && m?.t);

export interface SlateRule {
    type: string;
    after?: string;
    before?: string;
}

export interface MarkdownRule {
    order: number;
    requiredFirstCharacters?: Array<string>;
    react?: (node: any, recurseOutput, state) => React.JSX.Element;
    html?: (node: any, recurseOutput, state) => string;
    Slate?: SlateRule;

    [k: string]: any;
}

type Rules = { [key: string]: MarkdownRule; };

const humanTimeFormats = [
    "YYYY-MM-DD HH:mm", // 2024-03-21 13:30
    "[at] HH:mm [on] DD/MM", // at 13:30 on 21/03
    "HH:mm [on] DD/MM", // 13:30 on 21/03
    "HH:mm DD/MM/YYYY", // 13:30 21/03/2024
    "DD/MM/YYYY", // 21/03/2024
    "MM/DD/YYYY", // 03/21/2024
    "YYYY-MM-DD", // 2024-03-21
    "DD/MM", // 21/03
    "MM/DD", // 03/21
    "[at] h:mm:ss A", // at 1:30:45 PM
    "h:mm:ss A", // 1:30:45 PM
    "[at] h:mm:ssA", // at 1:30:45PM
    "h:mm:ssA", // 1:30:45PM
    "[at] h:mm A", // at 1:30 PM
    "h:mm A", // 1:30 PM
    "[at] h:mmA", // at 1:30PM
    "h:mmA", // 1:30PM
    "[at] hA", // at 1PM
    "hA", // 1PM
    "[at] h A", // at 1 PM
    "h A", // 1 PM
    "[at] HH:mm:ss", // at 13:30:45
    "HH:mm:ss", // 13:30:45
    "[at] HH:mm", // at 13:30
    "HH:mm", // 13:30
];

const humanTimeFormatRegex = [
    // YYYY-MM-DD HH:mm (2024-03-21 13:30)
    /[12]\d{3}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]) (?:[01]\d|2[0-3]):(?:[0-5]\d)/,
    // at HH:mm on DD/MM (at 13:30 on 21/03)
    /at (?:[01]\d|2[0-3]):(?:[0-5]\d) on (?:0[1-9]|[12]\d|3[01])\/(?:0[1-9]|1[0-2])/,
    // HH:mm on DD/MM (13:30 on 21/03)
    /(?:[01]\d|2[0-3]):(?:[0-5]\d) on (?:0[1-9]|[12]\d|3[01])\/(?:0[1-9]|1[0-2])/,
    // HH:mm DD/MM/YYYY (13:30 21/03/2024)
    /(?:[01]\d|2[0-3]):(?:[0-5]\d) (?:0[1-9]|[12]\d|3[01])\/(?:0[1-9]|1[0-2])\/[12]\d{3}/,
    // DD/MM/YYYY (21/03/2024)
    /(?:0[1-9]|[12]\d|3[01])\/(?:0[1-9]|1[0-2])\/[12]\d{3}/,
    // MM/DD/YYYY (03/21/2024)
    /(?:0[1-9]|1[0-2])\/(?:0[1-9]|[12]\d|3[01])\/[12]\d{3}/,
    // YYYY-MM-DD (2024-03-21)
    /[12]\d{3}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])/,
    // DD/MM (21/03)
    /(?:0[1-9]|[12]\d|3[01])\/(?:0[1-9]|1[0-2])/,
    // MM/DD (03/21)
    /(?:0[1-9]|1[0-2])\/(?:0[1-9]|[12]\d|3[01])/,
    // at h:mm:ss AM/PM (at 1:30:45 PM)
    /at (?:0?[1-9]|1[0-2]):(?:[0-5]\d):(?:[0-5]\d) ?[AaPp][Mm]/,
    // h:mm:ss AM/PM (1:30:45 PM)
    /(?:0?[1-9]|1[0-2]):(?:[0-5]\d):(?:[0-5]\d) ?[AaPp][Mm]/,
    // at h:mm AM/PM (at 1:30 PM)
    /at (?:0?[1-9]|1[0-2]):(?:[0-5]\d) ?[AaPp][Mm]/,
    // h:mm AM/PM (1:30 PM)
    /(?:0?[1-9]|1[0-2]):(?:[0-5]\d) ?[AaPp][Mm]/,
    // at h AM/PM (1 PM)
    /at (?:0?[1-9]|1[0-2]) ?[AaPp][Mm]/,
    // h AM/PM (1 PM)
    /(?:0?[1-9]|1[0-2]) ?[AaPp][Mm]/,
    // at HH:mm:ss (at 13:30:45)
    /at (?:[01]\d|2[0-3]):(?:[0-5]\d):(?:[0-5]\d)/,
    // HH:mm:ss (13:30:45)
    /(?:[01]\d|2[0-3]):(?:[0-5]\d):(?:[0-5]\d)/,
    // at HH:mm (at 13:30)
    /at (?:[01]\d|2[0-3]):(?:[0-5]\d)/,
    // HH:mm (13:30)
    /(?:[01]\d|2[0-3]):(?:[0-5]\d)/
];

function parseHumanTime(timeString) {
    // console.log("Parsing time", ":" + timeString + ":");
    // Try each format
    for (const format of humanTimeFormats) {
        const parsed = moment(timeString, format, true); // strict parsing
        if (parsed.isValid()) {
            return parsed;
        }
    }

    // Try natural language parsing as fallback
    const naturalParsed = moment(timeString);
    if (naturalParsed.isValid()) {
        return naturalParsed;
    }

    return null;
}

function freeze<T>(obj: T): T {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch {
        // If circular reference, return a shallow copy
        if (Array.isArray(obj)) {
            return [...obj] as T;
        } else if (typeof obj === "object" && obj !== null) {
            return { ...obj };
        }
        return obj;
    }
}

interface ValidTimeNode{
    type: "validTime";
    originalMatch: string;
    id: number;
    index: number;
    timestamp: {
        text: string;
        parsed: moment.Moment;
    };
}

// an object to track which nodes we've replaced
interface ParsedNode {
    id: number;
    originalText: string;
    fresh?: boolean;
    isExtension?: boolean;
    extendedText?: string;
    converted?: boolean;
    index: number;
    format: RegExp;
    parsed?: ValidTimeNode
}

let parsedNodes: ParsedNode[] = [];

function addNode(node: ParsedNode, targetArray: ParsedNode[] = parsedNodes) {
    const intersectingNodes = getIntersectingNodes(node.index, node.originalText.length, targetArray);

    // only add the node if it's not within another. if bigNode is in targetArray and I try to add smallNode1 or smallNode2, don't add them
    if (intersectingNodes.length) {
        const longerNode = intersectingNodes.find(n => {
            const newNodeText = node.fresh ? node.isExtension ? node.extendedText : node.originalText : "?";
            const oldNodeText = n.fresh ? n.isExtension ? n.extendedText : n.originalText : "?";
            // @ts-ignore
            return oldNodeText.length > newNodeText.length;
        });
        if (longerNode) {
            // console.log("ignoring", freeze(node), "because", freeze(longerNode), "is longer");
            return targetArray;
        }
    }

    // if there are nodes inside this index, remove them
    const filteredArray = targetArray.filter(n => {
            const keep = n.index < node.index || n.index > node.index + node.originalText.length;
            // if (!keep) console.log("removing", n, "because it is inside", node);
            return keep;
        }
    );

    // Add the node and sort the array
    filteredArray.push(node);
    filteredArray.sort((a, b) => a.index - b.index);

    // If we're working with the global parsedNodes, update it
    if (targetArray === parsedNodes) {
        parsedNodes = filteredArray;
    }

    return filteredArray;
}

function getIntersectingNodes(index: number, length: number = 0, arr: ParsedNode[] = parsedNodes) {
    return arr.filter(node => {
        // for readability
        const existingNodeStart = node.index;
        const existingNodeEnd = node.index + node.originalText.length;
        const searchingNodeStart = index;
        const searchingNodeEnd = index + length;

        return (
            // node start is within bigger one
            (searchingNodeStart >= existingNodeStart && searchingNodeStart <= existingNodeEnd) ||
            // node end is within bigger one
            (searchingNodeEnd >= existingNodeStart && searchingNodeEnd <= existingNodeEnd)
        );
    });
}

export let slateEditor: (typeof import("slate").Editor);

// searches for matches in a string with placeholders
// repairing them first and keeping track of which matches are from placeholders
function findTimesInOriginalSource(source: string) {
    const placeholderValues: any[] = [];
    const toRemove:any[] = [];

    if (source.includes("?")) {
        // check if any of our parsed nodes match the start of the source
        for (const node of parsedNodes.toReversed()) { // go backwards to preserve indices
            if (source.charAt(node.index) === "?") {
                placeholderValues.push(node);
            }else{
                // if there's no placeholder at this index the current node is no longer relevant
                toRemove.push(node);
            }
        }
    }else{
        // if there are no placeholders, we can remove all the parsed nodes
        parsedNodes = [];
    }

    parsedNodes = parsedNodes.filter(n => !toRemove.includes(n));

    // search for matches in the plain source
    for (const pattern of humanTimeFormatRegex) {
        const globalPattern = new RegExp(pattern, "g");
        let match = globalPattern.exec(source);
        while (match) {
            // console.log("Matched", match);
            const pNode = {
                originalText: match[0],
                index: match.index,
                format: pattern,
                id: new Date().getTime(),
                converted: false,
                fresh: true
            };
            parsedNodes = addNode(pNode, parsedNodes);
            match = globalPattern.exec(source);
        }
    }

    // now replace each placeholder's source in the regex with a ? and try matching extended matches
    for (const node of placeholderValues) {
        for(const pattern of humanTimeFormatRegex) {
            if(pattern === node.format) continue; // don't need to reparse the same format it already matched
            const globalPattern = new RegExp(pattern.source.replace(node.format.source, "(\\?)"), "g");
            // HH:mm:ss => (\?):ss
            // console.log("Converted pattern", pattern, globalPattern);
            let match = globalPattern.exec(source);
            while (match) {
                if(node.index !== match.index) {
                    // if(node.index !== match[0].indexOf("?")) {
                    // node match isn't at the same position as the existing placeholder
                    match = globalPattern.exec(source);
                    continue;
                }
                // console.log("Matched", match);
                const pNode = {
                    originalText: match[0],
                    index: match.index,
                    format: globalPattern,
                    id: new Date().getTime(),
                    isExtension: true,
                    fresh: true,
                    converted: false,
                    extendedText: match[0].replace("?", node.originalText)
                };
                // console.log("Extended node", freeze(pNode));
                parsedNodes = addNode(pNode, parsedNodes);
                match = globalPattern.exec(source);
            }
        }
    }

    parsedNodes = parsedNodes.sort((a, b) => a.index - b.index);
    // console.log("Parsed nodes", freeze(parsedNodes));
}

export const customRules: Rules = {
    validTime: {
        slateType: "inlineObject",
        order: 24,
        match: (source, state, lookbehind) => {
            if (!state.isSlate) return null;
            const wholeString = state?.prevCapture === null && !state.nestLevel;
            const nestedString = state?.prevCapture !== null && state.nestLevel;

            /* console.log("---------- Valid time rule ----------");
            if (wholeString) console.log("@@@@@@@ whole source matching @@@@@@@");
            if (nestedString) console.log("@@@@@@@ nested matching @@@@@@@");
            console.log("source", source);
            console.log("nestLevel", state.nestLevel);
            console.log("state", freeze(state));
            console.log("prevCapture", state.prevCapture);
            console.log("lookbehind", lookbehind); */

            // on the whole string pass, we will split the entire string into groups of matches and recurse the parse where the timestamp is the beginning of the match
            if (wholeString) {
                findTimesInOriginalSource(source);
                if(!parsedNodes.some(node => node.fresh)) return null;

                state.splitNodes = [];
                state.prepLevel = true;
                let prevIndex = -1;
                // go backwards and parse the string into nodes of matched times and regular text
                for (const node of parsedNodes.toReversed()) {
                    const nodeLength = node.fresh ? node.originalText.length : 1;
                    if(prevIndex === -1) prevIndex = node.index + nodeLength;
                    const afterText = node.index === prevIndex ? "" : source.substring(node.index + nodeLength, prevIndex);
                    if (afterText) {
                        state.splitNodes.push({
                            index: node.index + nodeLength,
                            text: afterText,
                            type: "prepText",
                            relevantNode: node,
                            id: -1
                        });
                    }

                    state.splitNodes.push({
                        index: node.index,
                        text: node.originalText,
                        actualText: node.fresh ? node.originalText : "?",
                        type: "prepValidTime",
                        node: node,
                        id: node.id
                    });

                    prevIndex = node.index;
                    node.fresh = false;
                }
                const beforeText = source.substring(0, prevIndex);
                if (beforeText) state.splitNodes.push({ index: 0, text: beforeText, type: "prepText" });
                state.splitNodes = state.splitNodes.sort((a, b) => a.index - b.index);
                // console.log("Split nodes", freeze(state.splitNodes));
                if (state.splitNodes.length) return /^.*/.exec(source);
            } else if (nestedString) {
                state.prepLevel = false;
                // on the nested pass, we will properly check for the timestamp
                // console.log("splitNodes", freeze(state.splitNodes));
                for(const node of parsedNodes) {
                    if(node.converted) continue;
                    // console.log("Checking node", freeze(node), "against", source);
                    if(source !== node.originalText) continue;
                    const match = node.format.exec(source);
                    // console.log("match", match);
                    if(match) {
                        return match;
                    }
                }
            }
            return null;
        },
        parse: (match, nestedParse, state) => {
            // console.log("match", freeze(match));
            // console.log("state", freeze(state));

            if(state.prepLevel){
                // console.log("########## Parsing prep time ##########");
                // console.log("this is a prep level", freeze(match), freeze(state));
                const returnNodes: any[] = [];
                for(const prepNode of state.splitNodes){
                    state.nestLevel ??= 0;
                    state.nestLevel++;
                    state.matchId = prepNode.id;
                    const textNodes = nestedParse(prepNode.actualText ?? prepNode.text, state);
                    state.nestLevel--;
                    returnNodes.push(...textNodes);
                }
                return returnNodes;
            }else{
                // console.log("########## Parsing valid time ##########");
                // console.log("this is a proper timestamp", freeze(match), freeze(state));
                const node = parsedNodes.find(n => n.id === state.matchId);
                // console.log("parsedNodes", freeze(parsedNodes));
                // console.log("Node", freeze(node));
                if (!node) return [];
                const validTimeNode = {
                    type: "validTime",
                    originalMatch: match[0],
                    id: node.id,
                    index: node.index,
                    timestamp: {
                        text: node.isExtension ? node.extendedText : node.originalText,
                        parsed: parseHumanTime(node.isExtension ? node.extendedText : node.originalText)
                    }
                };

                node.originalText = validTimeNode.timestamp.text ?? "";
                node.fresh = false;
                // @ts-ignore
                node.parsed = validTimeNode;
                node.converted = true;
                node.isExtension = false;
                node.extendedText = undefined;
                return validTimeNode;
            }

        },
        react: (node, recurseOutput, state) => {
            return node.timestamp.text;
        }
    }
};

const getParsedTimestamp = findByCodeLazy("{timestamp:", ",format:");

export default definePlugin({
    name: "TimestampsInChatbox",
    description: "Makes clickable hints to create timestamps as you type in the chatbox",
    authors: [{ name: "Suffocate", id: 772601756776923187n }],

    patches: [
        {
            find: /ignoreTrailingEmptyNodes:!0/,
            replacement: {
                match: /(editor:)(\i)(,channel:\i,disableEnterToSubmit:\i,)/,
                replace: "$1$self.getSlate($2)$3"
            }
        },
        {
            /** add markdown rules */
            find: "{RULES:",
            replacement: {
                match: /{RULES:([^,]*?),/,
                replace: "{RULES:$self.patchRules($1),"
            }
        },
        {
            /** add markdown rules */
            find: "type:\"verbatim\"",
            replacement: [
                {
                    match: /type:"skip"},/,
                    replace: "$&...$self.getSlateRules(),",
                },
                {
                    match: /(let\{content:\i,type:\i,originalMatch:\i}=(\i).*?)(case"timestamp":)(?<=originalMatch:\i}=(\i);.*?)/,
                    // replace: "$1case\"validTime\":return $self.getPosition($4);$3",
                    replace: "$1case\"validTime\":$3",
                }
            ]
        }, {
            /** add slate markdown render */
            find: "case\"commandMention\":return(",
            replacement: [
                {
                    match: /default:return null(?<=\((\i),\{attributes:(\i),className:(\i),.*?tamp:(\i).parsed}\),(\i).*?)/,
                    replace: "case\"validTime\": return $self.renderPotentialTimestamp($1,$2,$3,$4,$5);$&"
                }
            ]
        }, {
            find: "format);case\"applicationCommand\":",
            replacement: [
                {
                    match: /case"applicationCommand":return \i\((\i)\.children/,
                    replace: "case\"validTime\":return $self.getUnderlyingText($1);$&"
                }
            ]
        },
        {
            find: "case\"timestamp\":l",
            replacement: [
                {
                    match: /case"timestamp":(?<=(\i)=\{.*?guildId:(\i)\.data.*?)(?=.*?(\i),\i,\i.serializedChildren)/,
                    replace: "case\"validTime\":$1=$self.getSlateNode($2,$3);break;$&"
                },
                {
                    match: /"soundboard","timestamp"/,
                    replace: "$&,\"validTime\""
                }
            ]
        }
    ],

    customRules,

    getSlateRules: () => {
        return Object.fromEntries(Object.entries(customRules).map(([k, v]) => [k, { type: v?.slateType ?? "skip" }]));
    },
    getSlate: slate => {
        // console.log("Got slate editor", slate);
        slateEditor = slate;
        return slate;
    },
    patchRules: (rules: Rules) => {
        for (const rule in customRules) {
            rules[rule] = customRules[rule];
        }
        // console.log("rules", rules);
        return rules;
    },

    getSlateNode: (node, slate) => {
        slateEditor = slate;
        return {
            type: "validTime",
            data: node.data,
            origSlate: () => slate,
            children: [{ text: node.data.timestamp.text }],
        };
    },
    getPosition: node => {
        return node.index;
    },
    getUnderlyingText: node => {
        return node.data.timestamp.text;
    },
    renderPotentialTimestamp: (Container, attributes, classname, mdElement, children) => {
        return (
            <Container
                className={classname}
                attributes={attributes}
            >
                <Popout
                    position={"top"}
                    align={"center"}
                    renderPopout={() => (
                        <Menu.Menu
                            navId="vc-chatbox-timestamp-format"
                            onClose={() => {
                            }}
                        >
                            <Menu.MenuGroup
                                label="Timestamp format">
                                {Object.keys(TimeFormats).map(key => (
                                    <Menu.MenuItem
                                        id={key}
                                        label={TimeFormats[key](mdElement.data.timestamp.parsed)}
                                        key={key}
                                        action={() => {
                                            mdElement.origSlate().insertNode([{
                                                type: "timestamp",
                                                parsed: getParsedTimestamp(mdElement.data.timestamp.parsed.valueOf() / 1000, key),
                                                children: [{ text: "" }]
                                            }]);
                                        }}
                                    />
                                ))}
                            </Menu.MenuGroup>
                        </Menu.Menu>
                    )}
                >
                    {popoutProps => (
                        <TooltipContainer
                            element={"span"}
                            text={"Click to create a timestamp"}
                        >
                    <span
                        {...popoutProps}
                        style={{
                            textDecoration: "underline",
                            textDecorationStyle: "dotted",
                            cursor: "pointer"
                        }}>
                        {mdElement.data.timestamp.text}
                    </span>
                        </TooltipContainer>
                    )}
                </Popout>
                {children}
            </Container>
        );
    }
});
