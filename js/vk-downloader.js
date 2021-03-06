import axios from "axios";
import { CLASS_PROCESSED, GLOBAL_INIT_FLAG, DOWNLOAD_BUTTON_CLASS, ICON_BLUE_DOWNLOAD_BUTTON, DOWNLOAD_PROGRESS_CLASS } from "./constants";
import insertButtonBefore from "./download-button";
import { addStylesheet }  from "./utils";
import vkUnmaskUrl from "./vk-unmask-url";

const URL_LOAD_LINKS = "/al_audio.php";
const CHUNK_MAX_SIZE = 10;


export default function initVkDownloader() {
    const chunks = getTracksChunks();
    chunks.forEach(tracksRegistry => {
        loadURLs(tracksRegistry).then(
            (resp) => {
                const urlsRegistry = parseResponse(resp.data);
                addDownloadButtons(tracksRegistry, urlsRegistry);
            },
            (err) => {
                console.log(err);
            }
        );
    });

    if (!window[GLOBAL_INIT_FLAG]) {
        addStyleForVkButton();
        initAutoUpdate();
        window[GLOBAL_INIT_FLAG] = true;
    }
}

function initAutoUpdate() {
    var autoUpdateTimeoutId = 0;
    var prevUrl = location.toString();
    window.addEventListener("scroll", () => {
        clearTimeout(autoUpdateTimeoutId);
        autoUpdateTimeoutId = setTimeout(initVkDownloader, 100);
    });
    setInterval(() => {
        const url = location.toString();
        if (url !== prevUrl) {
            prevUrl = url;
            initVkDownloader();
        }
    }, 1000);
}

function getTracksChunks() {
    var chunks = [{}];
    var chunkNum = 0;
    var chunkSize = 0;

    Array.from(document.querySelectorAll(`.audio_row:not(.${CLASS_PROCESSED})`)).forEach(rowNode => {
        if (chunkSize == CHUNK_MAX_SIZE) {
            chunkNum++;
            chunks[chunkNum] = {};
            chunkSize = 0;
        }
        const data = JSON.parse(rowNode.dataset.audio);
        const track = {
            artist: data[4],
            title: data[3],
            node: rowNode,
            id: rowNode.id.substr(6)
        };
        rowNode.className += ` ${CLASS_PROCESSED}`;
        chunks[chunkNum][track.id] = track;
        chunkSize++;
    });

    return chunks;
}

function loadURLs(tracksRegistry) {
    const params = new URLSearchParams();
    params.append("act", "reload_audio");
    params.append("al", "1");
    params.append("ids", Object.keys(tracksRegistry).join(","));
    return axios.post(URL_LOAD_LINKS, params);
}

function parseResponse(responseText) {
    const lines = responseText.split("<!>");
    const jsonStr = lines.find(line => line.startsWith("<!json>"));
    if (!jsonStr) {
        return [];
    }
    return JSON.parse(jsonStr.substr(7).trim()).reduce((urlsRegistry, item) => {
        urlsRegistry[`${item[1]}_${item[0]}`] = vkUnmaskUrl(item[2]);
        return urlsRegistry
    }, {});
}

function addDownloadButtons(tracksRegistry, urlsRegistry) {
    for (var id in tracksRegistry) {
        const track = tracksRegistry[id];
        insertButtonBefore({
            node: track.node.querySelector(".audio_info"),
            url: urlsRegistry[id],
            fileName: `${track.artist} - ${track.title}.mp3`,
        });
    }
}

function addStyleForVkButton() {
    addStylesheet(`
        .${DOWNLOAD_BUTTON_CLASS} {
            display: block;
            float: left;
            width: 24px;
            height: 24px;
            margin: 5px 5px 0px 5px;
            background-image: url("${ICON_BLUE_DOWNLOAD_BUTTON}");
            font-size: 11px;
        }
        
        .${DOWNLOAD_BUTTON_CLASS}.${DOWNLOAD_PROGRESS_CLASS} {
            padding-top: 7px;
            height: 17px;
        }
        
        .${CLASS_PROCESSED} .audio_inline_player .audio_inline_player_left {
            padding: 0 45px;
        }`
    );
}
