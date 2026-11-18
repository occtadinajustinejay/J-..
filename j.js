
// ============================================
// J// — A WORLD OF MY OWN
// COMPLETE APP + MUSIC SYSTEM
// ============================================


// ============================================
// 1. DATABASE
// ============================================


const DB_NAME = "JWorldDatabase";
const DB_VERSION = 2;

let db;

const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onupgradeneeded = function (event) {

    db = event.target.result;

    const stores = [
        "posts",
        "drafts",
        "music",
        "playlists"
    ];

    stores.forEach(function (name) {

        if (!db.objectStoreNames.contains(name)) {

            db.createObjectStore(name, {
                keyPath: "id",
                autoIncrement: true
            });

        }

    });

};

request.onsuccess = function (event) {

    db = event.target.result;

    console.log("J// Database connected successfully!");

};

request.onerror = function (event) {

    console.error(
        "J// Database failed to open:",
        event.target.error
    );

};

request.onblocked = function () {

    console.warn(
        "J// Database upgrade is blocked. Close other J// tabs."
    );

};


request.onsuccess = async function (event) {

    db = event.target.result;

    await displayPosts();
    updatePostCount();

};

request.onerror = function () {

    alert("J// storage could not be opened.");

};


// DATABASE HELPERS

function getAllRecords(storeName) {

    return new Promise(function (resolve, reject) {

        const transaction = db.transaction(storeName, "readonly");

        const request = transaction.objectStore(storeName).getAll();

        request.onsuccess = function () {
            resolve(request.result);
        };

        request.onerror = function () {
            reject(request.error);
        };

    });

}


function addRecord(storeName, data) {

    return new Promise(function (resolve, reject) {

        const transaction = db.transaction(storeName, "readwrite");

        const request = transaction.objectStore(storeName).add(data);

        request.onsuccess = function () {
            resolve(request.result);
        };

        request.onerror = function () {
            reject(request.error);
        };

    });

}


function updateRecord(storeName, data) {

    return new Promise(function (resolve, reject) {

        const transaction = db.transaction(storeName, "readwrite");

        transaction.objectStore(storeName).put(data);

        transaction.oncomplete = resolve;
        transaction.onerror = function () {
            reject(transaction.error);
        };

    });

}


function deleteRecord(storeName, id) {

    return new Promise(function (resolve, reject) {

        const transaction = db.transaction(storeName, "readwrite");

        transaction.objectStore(storeName).delete(id);

        transaction.oncomplete = resolve;
        transaction.onerror = function () {
            reject(transaction.error);
        };

    });

}


// ============================================
// 2. POST SYSTEM
// ============================================

const captionInput = document.getElementById("postCaption");
const imageUpload = document.getElementById("imageUpload");
const imagePreview = document.getElementById("imagePreview");
const publishBtn = document.getElementById("publishBtn");
const saveDraftBtn = document.getElementById("saveDraftBtn");
const postsContainer = document.getElementById("postsContainer");

let selectedImages = [];


imageUpload.addEventListener("change", function () {

    selectedImages = Array.from(imageUpload.files);

    imagePreview.innerHTML = "";

    selectedImages.forEach(function (file) {

        const image = document.createElement("img");

        image.src = URL.createObjectURL(file);
        image.alt = "Post preview";

        imagePreview.appendChild(image);

    });

});


publishBtn.addEventListener("click", async function () {

    const caption = captionInput.value.trim();

    if (!caption && selectedImages.length === 0) {
        alert("Write something or upload a picture first!");
        return;
    }

    const images = await Promise.all(
        selectedImages.map(async function (file) {

            return {
                name: file.name,
                type: file.type,
                data: await file.arrayBuffer()
            };

        })
    );

    await addRecord("posts", {

        caption: caption,
        images: images,
        likes: 0,
        liked: false,
        comments: [],
        createdAt: new Date().toISOString()

    });

    captionInput.value = "";
    imageUpload.value = "";
    imagePreview.innerHTML = "";
    selectedImages = [];

    await displayPosts();
    updatePostCount();

    alert("Your memory has been published! ✧");

});


async function displayPosts() {

    const posts = await getAllRecords("posts");

    postsContainer.innerHTML = "";

    if (posts.length === 0) {

        postsContainer.innerHTML = `
            <div class="empty-state">
                <span>✧</span>
                <h3>Your world begins here.</h3>
                <p>Share your first memory.</p>
            </div>
        `;

        return;

    }

    posts.reverse().forEach(function (post) {

        const card = document.createElement("article");

        card.className = "post-card";

        const date = new Date(post.createdAt).toLocaleDateString();

        const dateElement = document.createElement("small");
        dateElement.textContent = date;

        const caption = document.createElement("p");
        caption.className = "post-caption";
        caption.textContent = post.caption;

        const imageContainer = document.createElement("div");
        imageContainer.className = "post-images";

        (post.images || []).forEach(function (file) {

            const image = document.createElement("img");

            image.src = URL.createObjectURL(
                new Blob([file.data], { type: file.type })
            );

            image.alt = "Uploaded memory";

            imageContainer.appendChild(image);

        });

        const actions = document.createElement("div");
        actions.className = "post-actions";

        const likeButton = document.createElement("button");

        likeButton.textContent =
            (post.liked ? "♥ " : "♡ ") + post.likes;

        likeButton.onclick = function () {
            toggleLike(post.id);
        };

        const commentButton = document.createElement("button");

        commentButton.textContent =
            "Comments (" + post.comments.length + ")";

        commentButton.onclick = function () {
            addComment(post.id);
        };

        const deleteButton = document.createElement("button");

        deleteButton.textContent = "Delete";

        deleteButton.onclick = function () {
            deletePost(post.id);
        };

        actions.append(likeButton, commentButton, deleteButton);

        card.append(
            dateElement,
            imageContainer,
            caption,
            actions
        );

        if (post.comments.length > 0) {

            const commentList = document.createElement("div");

            commentList.className = "comment-list";

            post.comments.forEach(function (comment) {

                const element = document.createElement("p");

                element.textContent = "♡ " + comment;

                commentList.appendChild(element);

            });

            card.appendChild(commentList);

        }

        postsContainer.appendChild(card);

    });

}


async function toggleLike(id) {

    const posts = await getAllRecords("posts");

    const post = posts.find(function (item) {
        return item.id === id;
    });

    if (!post) return;

    post.liked = !post.liked;
    post.likes += post.liked ? 1 : -1;

    await updateRecord("posts", post);
    displayPosts();

}


async function addComment(id) {

    const comment = prompt("Write your comment:");

    if (!comment || !comment.trim()) return;

    const posts = await getAllRecords("posts");

    const post = posts.find(function (item) {
        return item.id === id;
    });

    if (!post) return;

    post.comments.push(comment.trim());

    await updateRecord("posts", post);
    displayPosts();

}


async function deletePost(id) {

    if (!confirm("Delete this memory?")) return;

    await deleteRecord("posts", id);

    await displayPosts();
    updatePostCount();

}


saveDraftBtn.addEventListener("click", async function () {

    const caption = captionInput.value.trim();

    if (!caption && selectedImages.length === 0) {
        alert("Nothing to save yet!");
        return;
    }

    const images = await Promise.all(
        selectedImages.map(async function (file) {

            return {
                name: file.name,
                type: file.type,
                data: await file.arrayBuffer()
            };

        })
    );

    await addRecord("drafts", {

        caption: caption,
        images: images,
        createdAt: new Date().toISOString()

    });

    captionInput.value = "";
    imageUpload.value = "";
    imagePreview.innerHTML = "";
    selectedImages = [];

    alert("Draft saved! ✧");

});


function updatePostCount() {

    getAllRecords("posts").then(function (posts) {

        document.getElementById("postCount").textContent =
            posts.length;

    });

}


// ============================================
// 3. MUSIC SECTION
// ============================================

let currentAudioURL = null;


function showMusicSection() {

    const specialContent = document.getElementById("specialContent");
    const template = document.getElementById("musicTemplate");

    specialContent.innerHTML = "";

    specialContent.appendChild(
        template.content.cloneNode(true)
    );

    initializeMusic();

}


// MUSIC INITIALIZATION

async function initializeMusic() {

    const audioUpload = document.getElementById("audioUpload");

    const saveMusicBtn = document.getElementById("saveMusicBtn");

    const saveMusicLinkBtn =
        document.getElementById("saveMusicLinkBtn");

    const musicSearchBtn =
        document.getElementById("musicSearchBtn");

    const createPlaylistBtn =
        document.getElementById("createPlaylistBtn");


    // UPLOAD AUDIO

    saveMusicBtn.addEventListener("click", async function () {

        const files = Array.from(audioUpload.files);

        const title = document.getElementById("songTitle").value.trim();

        const artist = document.getElementById("songArtist").value.trim();

        if (files.length === 0) {
            alert("Choose an audio file first!");
            return;
        }

        for (const file of files) {

            if (!file.type.startsWith("audio/")) continue;

            await addRecord("music", {

                title: title || file.name.replace(/\.[^/.]+$/, ""),
                artist: artist || "Unknown Artist",
                type: "upload",
                file: file,
                favorite: false,
                createdAt: new Date().toISOString()

            });

        }

        audioUpload.value = "";

        document.getElementById("songTitle").value = "";
        document.getElementById("songArtist").value = "";

        await renderMusicLists();

        alert("Music added to your library! ♫");

    });


    // SAVE EXTERNAL MUSIC LINK

    saveMusicLinkBtn.addEventListener("click", async function () {

        const url = document.getElementById("musicLink").value.trim();

        const title = document.getElementById("linkSongTitle").value.trim();

        if (!url || !title) {
            alert("Enter a music link and its title.");
            return;
        }

        let parsedURL;

        try {
            parsedURL = new URL(url);
        } catch {
            alert("Please enter a valid music link.");
            return;
        }

        if (parsedURL.protocol !== "https:") {
            alert("Please use a secure HTTPS music link.");
            return;
        }

        const supportedDomains = [
            "spotify.com",
            "youtube.com",
            "youtu.be",
            "soundcloud.com",
            "music.apple.com"
        ];

        const supported = supportedDomains.some(function (domain) {

            return parsedURL.hostname === domain ||
                parsedURL.hostname.endsWith("." + domain);

        });

        if (!supported) {
            alert("This platform is not supported yet.");
            return;
        }

        await addRecord("music", {

            title: title,
            artist: "External Music",
            type: "link",
            url: parsedURL.href,
            favorite: false,
            createdAt: new Date().toISOString()

        });

        document.getElementById("musicLink").value = "";
        document.getElementById("linkSongTitle").value = "";

        await renderMusicLists();

        alert("Music link saved! ♡");

    });


    // SEARCH MUSIC

    musicSearchBtn.addEventListener("click", function () {

        const query = document.getElementById("musicSearch")
            .value.trim();

        if (!query) return;

        const searchURL =
            "https://open.spotify.com/search/" +
            encodeURIComponent(query);

        window.open(searchURL, "_blank", "noopener");

    });


    // CREATE PLAYLIST

    createPlaylistBtn.addEventListener("click", async function () {

        const name = prompt("Give your playlist a name:");

        if (!name || !name.trim()) return;

        await addRecord("playlists", {

            name: name.trim(),
            musicIds: [],
            createdAt: new Date().toISOString()

        });

        await renderMusicLists();

        alert("Your playlist has been created! ♫");

    });


    await renderMusicLists();

}


// ============================================
// 4. MUSIC PLAYER
// ============================================

async function playMusic(id) {

    const music = await getAllRecords("music");

    const song = music.find(function (item) {
        return item.id === id;
    });

    if (!song) return;

    const audioPlayer = document.getElementById("audioPlayer");

    const externalPlayer =
        document.getElementById("externalMusicPlayer");

    document.getElementById("nowPlayingTitle").textContent =
        song.title;

    document.getElementById("nowPlayingArtist").textContent =
        song.artist;

    externalPlayer.innerHTML = "";

    audioPlayer.pause();
    audioPlayer.removeAttribute("src");

    if (song.type === "upload") {

        if (currentAudioURL) {
            URL.revokeObjectURL(currentAudioURL);
        }

        currentAudioURL = URL.createObjectURL(song.file);

        audioPlayer.src = currentAudioURL;

        audioPlayer.hidden = false;

        audioPlayer.play().catch(function () {});

        return;

    }

    audioPlayer.hidden = true;

    const embed = getMusicEmbed(song.url);

    if (embed) {

        externalPlayer.appendChild(embed);

    } else {

        const link = document.createElement("a");

        link.href = song.url;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = "Open music platform ↗";

        externalPlayer.appendChild(link);

    }

}


// CONVERT SUPPORTED LINKS TO EMBEDS

function getMusicEmbed(url) {

    const parsed = new URL(url);

    let embedURL = "";

    if (parsed.hostname === "open.spotify.com" ||
        parsed.hostname.endsWith(".spotify.com")) {

        const match = parsed.pathname.match(
            /^\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/
        );

        if (match) {

            embedURL =
                "https://open.spotify.com/embed/" +
                match[1] + "/" + match[2];

        }

    }

    else if (
        parsed.hostname === "youtube.com" ||
        parsed.hostname.endsWith(".youtube.com") ||
        parsed.hostname === "youtu.be"
    ) {

        let videoID = "";

        if (parsed.hostname === "youtu.be") {

            videoID = parsed.pathname.slice(1);

        } else if (parsed.pathname === "/watch") {

            videoID = parsed.searchParams.get("v") || "";

        } else if (parsed.pathname.startsWith("/shorts/") ||
                   parsed.pathname.startsWith("/embed/")) {

            videoID = parsed.pathname.split("/")[2] || "";

        }

        if (/^[a-zA-Z0-9_-]{11}$/.test(videoID)) {

            embedURL =
                "https://www.youtube-nocookie.com/embed/" +
                videoID;

        }

    }

    else if (
        parsed.hostname === "soundcloud.com" ||
        parsed.hostname.endsWith(".soundcloud.com")
    ) {

        embedURL =
            "https://w.soundcloud.com/player/?url=" +
            encodeURIComponent(url) +
            "&auto_play=false";

    }

    else if (parsed.hostname === "music.apple.com") {

        const match = parsed.pathname.match(
            /^\/([a-z]{2})\/(album|playlist)\/(.+)$/i
        );

        if (match) {

            embedURL =
                "https://embed.music.apple.com/" +
                match[1] + "/" +
                match[2] + "/" +
                match[3];

        }

    }

    if (!embedURL) return null;

    const iframe = document.createElement("iframe");

    iframe.src = embedURL;

    iframe.width = "100%";
    iframe.height = "180";

    iframe.allow =
        "autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture";

    iframe.loading = "lazy";
    iframe.title = "External music player";

    iframe.style.border = "0";
    iframe.style.borderRadius = "14px";

    return iframe;

}


// ============================================
// 5. MUSIC LIBRARY + FAVORITES
// ============================================

async function renderMusicLists() {

    const music = await getAllRecords("music");

    const playlists = await getAllRecords("playlists");

    const library = document.getElementById("musicLibraryContainer");

    const favorites =
        document.getElementById("favoriteMusicContainer");

    const recent =
        document.getElementById("recentMusicContainer");

    const playlistContainer =
        document.getElementById("playlistContainer");


    library.innerHTML = "";
    favorites.innerHTML = "";
    recent.innerHTML = "";
    playlistContainer.innerHTML = "";


    if (music.length === 0) {

        library.textContent = "Your library is waiting for music.";
        favorites.textContent = "No favorite songs yet.";
        recent.textContent = "No recently added music.";

    }


    // MUSIC ROW CREATOR

    function createMusicRow(song) {

        const row = document.createElement("div");

        row.className = "music-row";

        const information = document.createElement("div");

        information.className = "music-row-info";

        const title = document.createElement("strong");

        title.textContent = song.title;

        const artist = document.createElement("p");

        artist.textContent =
            song.artist + (song.type === "link" ? " · External" : " · Upload");

        information.append(title, artist);


        const controls = document.createElement("div");

        controls.className = "music-row-controls";


        const playButton = document.createElement("button");

        playButton.textContent = "▶";

        playButton.title = "Play music";

        playButton.onclick = function () {

            playMusic(song.id);

        };


        const favoriteButton = document.createElement("button");

        favoriteButton.textContent =
            song.favorite ? "♥" : "♡";

        favoriteButton.title = "Toggle favorite";

        favoriteButton.onclick = async function () {

            song.favorite = !song.favorite;

            await updateRecord("music", song);

            await renderMusicLists();

        };


        const playlistButton = document.createElement("button");

        playlistButton.textContent = "+";

        playlistButton.title = "Add to playlist";

        playlistButton.onclick = async function () {

            await addSongToPlaylist(song.id);

        };


        const deleteButton = document.createElement("button");

        deleteButton.textContent = "×";

        deleteButton.title = "Delete music";

        deleteButton.onclick = async function () {

            if (!confirm("Delete this music from your library?")) {
                return;
            }

            await deleteRecord("music", song.id);

            const allPlaylists = await getAllRecords("playlists");

            for (const playlist of allPlaylists) {

                playlist.musicIds =
                    playlist.musicIds.filter(function (id) {
                        return id !== song.id;
                    });

                await updateRecord("playlists", playlist);

            }

            await renderMusicLists();

        };


        controls.append(
            playButton,
            favoriteButton,
            playlistButton,
            deleteButton
        );

        row.append(information, controls);

        return row;

    }


    // FULL LIBRARY

    music.slice().reverse().forEach(function (song) {

        library.appendChild(createMusicRow(song));

    });


    // FAVORITES

    const favoriteSongs = music.filter(function (song) {
        return song.favorite;
    });

    if (favoriteSongs.length === 0) {

        favorites.textContent = "No favorite songs yet.";

    } else {

        favoriteSongs.forEach(function (song) {

            favorites.appendChild(createMusicRow(song));

        });

    }


    // RECENTLY ADDED

    music.slice().reverse().slice(0, 5).forEach(function (song) {

        recent.appendChild(createMusicRow(song));

    });


    // PLAYLISTS

    if (playlists.length === 0) {

        playlistContainer.textContent = "No playlists yet.";

    }

    playlists.forEach(function (playlist) {

        const box = document.createElement("div");

        box.className = "playlist-card";

        const heading = document.createElement("h4");

        heading.textContent = "♫ " + playlist.name;

        const count = document.createElement("p");

        count.textContent =
            playlist.musicIds.length + " songs";

        box.append(heading, count);


        playlist.musicIds.forEach(function (id) {

            const song = music.find(function (item) {
                return item.id === id;
            });

            if (song) {

                const row = createMusicRow(song);

                box.appendChild(row);

            }

        });


        const deletePlaylist = document.createElement("button");

        deletePlaylist.textContent = "Delete playlist";

        deletePlaylist.onclick = async function () {

            if (!confirm("Delete this playlist?")) return;

            await deleteRecord("playlists", playlist.id);

            await renderMusicLists();

        };

        box.appendChild(deletePlaylist);

        playlistContainer.appendChild(box);

    });


    // SEARCH FILTER

    const searchInput = document.getElementById("musicSearch");

    searchInput.addEventListener("input", function () {

        const query = searchInput.value.toLowerCase();

        library.querySelectorAll(".music-row").forEach(function (row) {

            row.hidden = !row.textContent.toLowerCase().includes(query);

        });

    });

}


// ============================================
// 6. ADD MUSIC TO PLAYLIST
// ============================================

async function addSongToPlaylist(songID) {

    const playlists = await getAllRecords("playlists");

    if (playlists.length === 0) {

        alert("Create a playlist first!");
        return;

    }

    const options = playlists.map(function (playlist, index) {

        return (index + 1) + ". " + playlist.name;

    }).join("\n");


    const answer = prompt(
        "Choose a playlist number:\n\n" + options
    );

    if (!answer) return;

    const index = Number(answer) - 1;

    if (!Number.isInteger(index) || !playlists[index]) {

        alert("Invalid playlist selection.");
        return;

    }

    const selectedPlaylist = playlists[index];

    if (selectedPlaylist.musicIds.includes(songID)) {

        alert("This song is already in that playlist.");
        return;

    }

    selectedPlaylist.musicIds.push(songID);

    await updateRecord("playlists", selectedPlaylist);

    await renderMusicLists();

    alert("Added to " + selectedPlaylist.name + "! ♡");

}


// ============================================
// 7. NAVIGATION
// ============================================

const navigationButtons =
    document.querySelectorAll("[data-section]");


navigationButtons.forEach(function (button) {

    button.addEventListener("click", function () {

        showSection(button.dataset.section);

    });

});


function showSection(section) {

    const createPost = document.getElementById("createPost");

    const contentArea = document.getElementById("contentArea");

    const specialSection = document.getElementById("specialSection");

    navigationButtons.forEach(function (button) {

        button.classList.toggle(
            "active",
            button.dataset.section === section
        );

    });


    if (section === "home") {

        createPost.hidden = false;
        contentArea.hidden = false;
        specialSection.hidden = true;

        return;

    }

    createPost.hidden = true;
    contentArea.hidden = true;
    specialSection.hidden = false;


    const titles = {

        library: ["My Library", "Everything I keep."],
        collection: ["Collection", "My favorite things."],
        anime: ["My Anime", "Stories beyond reality."],
        movies: ["My Movies", "A collection of films."],
        music: ["My Music", "Sounds of my world."],
        stories: ["My Stories", "Chapters written by me."],
        reflections: ["Reflections", "A little space for my thoughts."]

    };


    const details = titles[section] || [
        "My World",
        "A personal space."
    ];


    document.getElementById("specialTitle").textContent =
        details[0];

    document.getElementById("specialDescription").textContent =
        details[1];


    renderSpecialSection(section);

}


function renderSpecialSection(section) {

    const container = document.getElementById("specialContent");

    container.innerHTML = "";

    if (section === "music") {

        showMusicSection();

        return;

    }


    const messages = {

        library: "Your personal library will live here.",
        collection: "Your saved memories will live here.",
        anime: "Your anime collection will live here.",
        movies: "Your movie collection will live here.",
        stories: "Your own chapters will live here.",
        reflections: "Your private thoughts will live here."

    };


    const message = document.createElement("p");

    message.className = "empty-state";

    message.textContent =
        messages[section] || "Coming soon.";

    container.appendChild(message);

}


// ============================================
// 8. PROFILE
// ============================================

document.getElementById("editProfileBtn")
    .addEventListener("click", function () {

        const name = prompt("Enter your profile name:");

        if (name && name.trim()) {

            document.getElementById("profileName").textContent =
                name.trim();

        }

        const bio = prompt("Write your new bio:");

        if (bio !== null) {

            document.getElementById("profileBio").textContent =
                bio;

        }

    });


// ============================================
// 9. BOTTOM CREATE BUTTON
// ============================================

document.getElementById("bottomCreateBtn")
    .addEventListener("click", function () {

        showSection("home");

        document.getElementById("createPost")
            .scrollIntoView({
                behavior: "smooth"
            });

    });


// ============================================
// 10. SEARCH BUTTON
// ============================================

document.getElementById("searchBtn")
    .addEventListener("click", function () {

        const search = prompt("Search your world:");

        if (!search) return;

        showSection("home");

        const cards = document.querySelectorAll(".post-card");

        cards.forEach(function (card) {

            card.hidden = !card.textContent
                .toLowerCase()
                .includes(search.toLowerCase());

        });

    });


// ============================================
// 11. NOTIFICATIONS
// ============================================

document.getElementById("notificationBtn")
    .addEventListener("click", function () {

        alert("You're all caught up. No new notifications. ✧");

    });


// ============================================
// 12. PROFILE MENU
// ============================================

document.getElementById("profileMenuBtn")
    .addEventListener("click", function () {

        alert("Welcome to your personal J// world.");

    });

