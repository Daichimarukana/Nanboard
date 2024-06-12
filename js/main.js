$(function() {
	//Load----------------------------------------------------------------
	var z_Index = 1;
	var Local_roomId = null;
	var roomId = null;
	var encryptionKey = null;

	// 鍵生成関数
	function make_roomId(check, select){
		if(Local_roomId == null){
			Local_roomId = Math.random().toString(36).substring(2, 8);
			roomId = String(CryptoJS.SHA3(Local_roomId));
			encryptionKey = gen_Random_Text(Local_roomId); // 鍵を生成
			if(select == 0){
				return Local_roomId;
			}else if(select == 1){
				return roomId;
			}
			return null;
		}else{
			if(check == true){
				Local_roomId = Math.random().toString(36).substring(2, 8);
				roomId = String(CryptoJS.SHA3(Local_roomId));
				encryptionKey = gen_Random_Text(Local_roomId); // 鍵を生成
				if(select == 0){
					return Local_roomId;
				}else if(select == 1){
					return roomId;
				}
				return null;
			}
		}
	}

	function gen_Random_Text(seed) {
		var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		var length = 32;

		Math.seedrandom(seed.toString());
		
		var randomString = '';
		for (var i = 0; i < length; i++) {
			randomString += characters.charAt(Math.floor(Math.random() * characters.length));
		}
		return randomString;
	}

	function enc_text(text, key){
		return String(CryptoJS.AES.encrypt(text, key));
	}

	function dec_text(text, key){
		return String(CryptoJS.AES.decrypt(text, key).toString(CryptoJS.enc.Utf8));
	}

	// データの暗号化
	function encryptPayload(data, key) {
		const encryptedData = {};
		for (const [k, v] of Object.entries(data)) {
			if (k === 'type' || k === 'roomId' || k === 'errorcode') {
				encryptedData[k] = v;
			} else {
				encryptedData[k] = enc_text(JSON.stringify(v), key); // オブジェクトも文字列にして暗号化
			}
		}
		return encryptedData;
	}

	// データの復号化
	function decryptPayload(data, key) {
		const decryptedData = {};
		for (const [k, v] of Object.entries(data)) {
			if (k === 'type' || k === 'roomId' || k === 'errorcode') {
				decryptedData[k] = v;
			} else {
				decryptedData[k] = JSON.parse(dec_text(v, key)); // 復号化してからオブジェクトに変換
			}
		}
		return decryptedData;
	}

	function htmlEscape(unsafeText){
		if(typeof unsafeText !== 'string'){
		  return unsafeText;
		}
		return unsafeText.replace(
		  /[&'`"<>]/g, 
		  function(match) {
			return {
			  '&': '&amp;',
			  "'": '&#x27;',
			  '`': '&#x60;',
			  '"': '&quot;',
			  '<': '&lt;',
			  '>': '&gt;',
			}[match]
		  }
		);
	}

	function view_error(errormsg){
		$("#error_message").html(htmlEscape(errormsg).replace(/\n/g, '<br>'));
		$("#error").show();
		console.error(errormsg);
	}

	function check_browser(){
		/*-----Access Check-----*/
		const ua = window.navigator.userAgent;
		var user_agent_browser = "";
		var user_agent_ssl = "";
		var user_agent_access = "";
		var errcode = "";
		/*browser*/
		if (ua.indexOf('Edge') != -1 || ua.indexOf('Edg') != -1) {
			user_agent_browser = 'Microsoft_Edge';
		} else if (ua.indexOf('Trident') != -1 || ua.indexOf('MSIE') != -1) {
			user_agent_browser = 'Microsoft_Internet_Explorer';
		} else if (ua.indexOf('OPR') != -1 || ua.indexOf('Opera') != -1) {
			user_agent_browser = 'Opera';
		} else if (ua.indexOf('Chrome') != -1) {
			user_agent_browser = 'Google_Chrome';
		} else if (ua.indexOf('Firefox') != -1) {
			user_agent_browser = 'FireFox';
		} else if (ua.indexOf('Safari') != -1) {
			user_agent_browser = 'Safari';
		} else if (ua.indexOf('NintendoBrowser') != -1) {
			user_agent_browser = 'NintendoBrowser';
		} else {
			user_agent_browser = 'Other';
		}
		/*SSL*/
		if (location.protocol == 'http:') {
			if (location.hostname == 'localhost') {
				user_agent_ssl = "not_ssl";
			} else {
				user_agent_ssl = "not_ssl_bad";
			}
		} else if (location.protocol == 'https:') {
			user_agent_ssl = "ssl";
		} else {
			user_agent_ssl = "Other";
		}
		/*Main Access check*/
		if (user_agent_browser == 'Microsoft_Internet_Explorer' || user_agent_browser == 'NintendoBrowser' || user_agent_browser == 'FireFox' || user_agent_browser == 'Safari') {
			user_agent_access = 'bad';
			errcode = '申し訳ございませんが、非推奨のブラウザが使用されているようです。\n一部の機能が正常に動作しない可能性がございます。\n[Browser_not_support]';
		} else if (user_agent_ssl == 'Other') {
			user_agent_access = 'bad';
			errcode = '申し訳ございませんが、SSL/TLSが使用できません。\nこれによりこの接続ではプライパシーが保護されないおそれがあります。\n[None_ssl]';
		} else if (user_agent_ssl == 'not_ssl_bad') {
			user_agent_access = 'bad';
			errcode = '申し訳ございませんが、サーバー側でSSL/TLSの設定がされていない模様です。\nサービスの管理者に連絡してください。\n[Bad_server_ssl]';
		} else {
			user_agent_access = 'ok';
			errcode = 'エラーはありません。\n[None_error]';
		}
		if (user_agent_access == 'bad') {
			view_error(errcode);
		}
	}
	setTimeout(check_browser, 0)

	const canvas = $('#canvas')[0];//Canvasを宣言
	const context = canvas.getContext('2d');
	
	var currentItem = null;//アイテム選択用

	context.fillStyle = 'white';//Canvasを白く塗りつぶす
	context.fillRect(0, 0, canvas.width, canvas.height);

	//Server----------------------------------------------------------

	const ws = new WebSocket('wss://nanboard-server.emptybox.win');

	ws.onmessage = function(event) {
		const encryptedData = JSON.parse(event.data);
		const data = decryptPayload(encryptedData, encryptionKey); // 受信データを復号化
		switch (data.type) {
			case 'room_created':
				if(roomId == data.roomId){
					$('#roomId').text(Local_roomId);
					$('#roomIdInput').val(Local_roomId);
				}
				break;
			case 'sticker_message':
				displaySticker(data.color, data.message, data.sticker_id, data.x, data.y);
				break;
			case 'sticker_delete':
				displayDelSticker(data.sticker_id);
				break;
			case 'text_message':
				displayText(data.color, data.message, data.text_id, data.x, data.y, data.size);
				break;
			case 'text_delete':
				displayDelText(data.text_id);
				break;
			case 'state_request':
				sendCurrentState();
				break;
			case 'state_response':
				syncState(data.state);
				break;
			case 'error':
				view_error(data.errorcode);
				break;
		}
	};

	$('#createRoom').click(function() {
		roomId = make_roomId(true, 1);
		ws.send(JSON.stringify(encryptPayload({ type: 'create_room', roomId: roomId }, encryptionKey)));
	});

	//Connect----------------------------------------------------------------------------------
	$('#joinRoom').click(function() {
		Local_roomId = $('#roomIdInput').val();
		roomId = String(CryptoJS.SHA3(Local_roomId));
		encryptionKey = gen_Random_Text(Local_roomId); // 既存のLocal_roomIdを使って鍵を生成
		ws.send(JSON.stringify(encryptPayload({ type: 'join_room', roomId: roomId }, encryptionKey)));
		$('#room').hide();
		$('#edit').show();
		resetCanvas();
	});
	function auto_connect(){
		var url_query = new URLSearchParams(window.location.search)
		if(url_query.has('room') === true){
			if(url_query.get('room').length === 6){
				Local_roomId = url_query.get('room');
				roomId = String(CryptoJS.SHA3(Local_roomId));
				encryptionKey = gen_Random_Text(Local_roomId); // 既存のLocal_roomIdを使って鍵を生成
				ws.send(JSON.stringify(encryptPayload({ type: 'join_room', roomId: roomId }, encryptionKey)));
				$('#room').hide();
				$('#edit').show();
				resetCanvas();
				requestCurrentState();
			}
		}
	}

	function displaySticker(color, message, sticker_id, x, y) {
		if (!($('#' + sticker_id + '').length)) {
			var sticker = $('<textarea class="sticker" id="' + sticker_id + '">' + message + '</textarea>');
			sticker.css({ left: x, top: y, 'background-color': color});
			$('#itemsArea').append(sticker);

			select_sticker(sticker);
		} else {
			$('#' + sticker_id + '').val(message);
			$('#' + sticker_id + '').text(message);
			$('#' + sticker_id + '').css({ left: x, top: y, 'background-color': color});
		}
	}

	function displayDelSticker(sticker_id){
		if ($('#' + sticker_id + '').length) {
			$("#"+sticker_id).remove();
		}
	}

	function displayText(color, message, text_id, x, y, size) {
		if (!($('#' + text_id + '').length)) {
			var text = $('<textarea class="text" id="' + text_id + '">' + message + '</textarea>');
			text.css({ left: x, top: y, 'color': color, 'font-size': size+'px'});
			$('#itemsArea').append(text);

			select_text(text);
		} else {
			$('#' + text_id + '').val(message);
			$('#' + text_id + '').text(message);
			$('#' + text_id + '').css({ left: x, top: y, 'color': color, 'font-size': size+'px'});
		}
	}

	function displayDelText(text_id){
		if ($('#' + text_id + '').length) {
			$("#"+text_id).remove();
		}
	}
	//Reset_canvas-----------------------------------------------------------------
	function resetCanvas(){
		const rect = canvas.getBoundingClientRect();//canvas sizeを取得
		canvas.width = rect.width;//Cssのサイズを反映
		canvas.height = rect.height;
	}
	//Save-------------------------------------------------------------------------
	$("#getSave").click(function() {
		var type = $('#dl_datatype').val();
		save_data_type(type);
		$("#save").show();
	});
	$('#dl_datatype').change(function() {
		var type = $('#dl_datatype').val();
		save_data_type(type);
	});
	function save_data_type(type){
		if(type == "nan"){
			var blob = new Blob([JSON.stringify(getCurrentState(true))], { type: 'application/json' });
			$("#download_button").attr("href",window.URL.createObjectURL(blob));
			$("#download_button").attr("download","NanBoard_"+Local_roomId+".nan");
		}else if(type == "png"){
			var elem = $("#itemsArea")[0];
			var scale = 2;

			var e2i = new Elem2Img();
			e2i.get_png(get_image, elem, scale);

			function get_image(img_data){
				$("#download_button").attr("href",img_data);
				$("#download_button").attr("download","NanBoard_"+Local_roomId+".png");
			}
		}else if(type == "jpg"){
			var elem = $("#itemsArea")[0];
			var scale = 2;

			var e2i = new Elem2Img();
			e2i.get_jpeg(get_image, elem, scale);

			function get_image(img_data){
				$("#download_button").attr("href",img_data);
				$("#download_button").attr("download","NanBoard_"+Local_roomId+".jpg");
			}
		}else if(type == "webp"){
			var elem = $("#itemsArea")[0];
			var scale = 2;

			var e2i = new Elem2Img();
			e2i.get_webp(get_image, elem, scale);

			function get_image(img_data){
				$("#download_button").attr("href",img_data);
				$("#download_button").attr("download","NanBoard_"+Local_roomId+".webp");
			}
		}
	}
	$("#save_close").click(function() {
		$("#save").hide();
	});
	//Load-------------------------------------------------------------------------
	$("#openFile").click(async () => {
		const options = {
			types: [
				{
					description: 'NanBoard File',
					accept: {
						'application/json': ['.nan']
					}
				}
			],
			multiple: false
		};
		const fh_list = await window.showOpenFilePicker(options);
		const fh = fh_list[0];
		const file = await fh.getFile();

		const reader = new FileReader();
		reader.readAsText(file, 'UTF-8');
		reader.onload = (event) => {
			var loaddata = null;
			try{
				loaddata = JSON.parse(event.target.result);
				if(!(loaddata.type == "nan_board_save_data")){
					view_error("セーブデータの形式が不正です。\n[Huh_savedata]");
					loaddata = null;
				}
			} catch (error) {
				loaddata = null;
				view_error("セーブデータの形式が間違っているようです。\n[Bad_savedata]");
			}
			if(loaddata){
				syncState(loaddata.state);
			}
		};
	});
	//New Sync---------------------------------------------------------------------
	function requestCurrentState() {
		ws.send(JSON.stringify(encryptPayload({ type: 'state_request', roomId: roomId }, encryptionKey)));
	}

	function getCurrentState(save) {
		const stickers = $('.sticker').map((index, sticker) => ({
			message: $(sticker).val().replace(/<br>/g, '\n'),
			color: $(sticker).css('background-color'),
			sticker_id: $(sticker).attr('id'),
			x: parseInt($(sticker).css('left')),
			y: parseInt($(sticker).css('top'))
		})).get();

		const texts = $('.text').map((index, text) => ({
			message: $(text).val().replace(/<br>/g, '\n'),
			color: $(text).css('color'),
			text_id: $(text).attr('id'),
			x: parseInt($(text).css('left')),
			y: parseInt($(text).css('top')),
			size: parseInt($(text).css('font-size'))
		})).get();

		var type = null
		if(save == true){
			type = "nan_board_save_data";
			saveId = Local_roomId;
		}else{
			type = "state_response";
			saveId = roomId;
		}
		return { type: type, roomId: saveId, state: { stickers, texts } };
	}
	function sendCurrentState(){
		ws.send(JSON.stringify(encryptPayload(getCurrentState(false), encryptionKey)));
	}
	function syncState(state) {
		state.stickers.forEach(sticker => displaySticker(sticker.color, sticker.message, sticker.sticker_id, sticker.x, sticker.y));
		state.texts.forEach(text => displayText(text.color, text.message, text.text_id, text.x, text.y, text.size));
	}


	//Local------------------------------------------------------------------------
	function select_sticker(sticker) {
		sticker.on('mousedown' || 'touchstart', function(event) {
			resetCanvas();

			z_Index++;
			sticker.css('z-index', z_Index);

			let offsetX = event.clientX - sticker.offset().left;
			let offsetY = event.clientY - sticker.offset().top;

			$(document).on('mousemove.sticker' || 'touchmove.sticker', function(event) {
				let newLeft = event.clientX - offsetX;
				let newTop = event.clientY - offsetY;

				newLeft = Math.max(canvas.offsetLeft, Math.min(newLeft, canvas.offsetLeft + canvas.width - sticker.outerWidth()));
				newTop = Math.max(canvas.offsetTop, Math.min(newTop, canvas.offsetTop + canvas.height - sticker.outerHeight()));

				sticker.css({ left: newLeft + 'px', top: newTop + 'px' });
			}).on('mouseup.sticker' || 'touchend.sticker', function() {
				$(document).off('.sticker');
				ws.send(JSON.stringify(encryptPayload({ 
					type: 'sticker_message', 
					roomId: roomId, 
					color: sticker.css('background-color'), 
					message: sticker.val(),
					sticker_id: sticker.attr('id'),
					x: sticker.css('left'),
					y: sticker.css('top')
				}, encryptionKey)));
			});
		}).on('contextmenu', function(event) {
			event.preventDefault();
			currentItem = sticker;

			$('#contextMenu').css({ left: event.pageX + 'px', top: event.pageY + 'px' }).show();
			$('#textsize').hide(); // 隠す
		}).on('blur', function(event) {
			ws.send(JSON.stringify(encryptPayload({ 
				type: 'sticker_message', 
				roomId: roomId, 
				color: sticker.css('background-color'), 
				message: sticker.val(),
				sticker_id: sticker.attr('id'),
				x: sticker.css('left'),
				y: sticker.css('top')
			}, encryptionKey)));
		});
	}

	function select_text(text) {
		text.on('mousedown', function(event) {
			resetCanvas();

			z_Index++;
			text.css('z-index', z_Index);

			let offsetX = event.clientX - text.offset().left;
			let offsetY = event.clientY - text.offset().top;

			$(document).on('mousemove.text', function(event) {
				let newLeft = event.clientX - offsetX;
				let newTop = event.clientY - offsetY;

				newLeft = Math.max(canvas.offsetLeft, Math.min(newLeft, canvas.offsetLeft + canvas.width - text.outerWidth()));
				newTop = Math.max(canvas.offsetTop, Math.min(newTop, canvas.offsetTop + canvas.height - text.outerHeight()));

				text.css({ left: newLeft + 'px', top: newTop + 'px' });
			}).on('mouseup.text', function() {
				$(document).off('.text');
				ws.send(JSON.stringify(encryptPayload({ 
					type: 'text_message', 
					roomId: roomId, 
					color: text.css('color'), 
					message: text.val(),
					text_id: text.attr('id'),
					x: text.css('left'),
					y: text.css('top'),
					size: parseInt(text.css('font-size'), 10)
				}, encryptionKey)));
			});
		}).on('contextmenu', function(event) {
			event.preventDefault();
			currentItem = text;

			$('#contextMenu').css({ left: event.pageX + 'px', top: event.pageY + 'px' }).show();
			$('#textsize').show().val(parseInt(currentItem.css('font-size'), 10)); // 表示してサイズをセット
		}).on('blur', function(event) {
			ws.send(JSON.stringify(encryptPayload({ 
				type: 'text_message', 
				roomId: roomId, 
				color: text.css('color'), 
				message: text.val(),
				text_id: text.attr('id'),
				x: text.css('left'),
				y: text.css('top'),
				size: parseInt(text.css('font-size'), 10)
			}, encryptionKey)));
		});
	}

	//Sticker------------------------------------------------
	$('#addSticker').click(function() {
		var rnd_id = Math.random().toString(36).substring(2, 8);
		displaySticker('#FFEB3B', 'New Sticky Note', rnd_id, 50, 130);
		ws.send(JSON.stringify(encryptPayload({ 
			type: 'sticker_message', 
			roomId: roomId, 
			color: '#FFEB3B', 
			message: 'New Sticky Note',
			sticker_id: rnd_id,
			x: 50,
			y: 130
		}, encryptionKey)));
	});
	//text-----------------------------------------------------
	$('#addText').click(function() {
		var rnd_id = Math.random().toString(36).substring(2, 8);
		displayText('#000000', 'New Text', rnd_id, 50, 130, 24);
		ws.send(JSON.stringify(encryptPayload({ 
			type: 'text_message', 
			roomId: roomId, 
			color: '#000000', 
			message: 'New Text',
			text_id: rnd_id,
			x: 50,
			y: 130,
			size: 24
		}, encryptionKey)));
	});
	//CopyLink---------------------------------------------------
	$('#copyLink').click(function() {
		navigator.clipboard.writeText(location.protocol + "//" + location.host + "/?room=" + Local_roomId);
		$("#notice_msg").text("ルームのリンクをコピーしました！");
		$("#notice").show();
		setTimeout(() => {
			$("#notice").hide();
		}, 5000);
	});

	$('#deleteSticker').click(function() {
		if (currentItem) {
			let sticker_id = currentItem.attr('id');
			ws.send(JSON.stringify(encryptPayload({ type: 'sticker_delete', roomId: roomId, sticker_id: sticker_id }, encryptionKey)));
			currentItem.remove();
			currentItem = null;
			$('#contextMenu').hide();
		}
		if (currentItem) {
			let text_id = currentItem.attr('id');
			ws.send(JSON.stringify(encryptPayload({ type: 'text_delete', roomId: roomId, text_id: text_id }, encryptionKey)));
			currentItem.remove();
			currentItem = null;
			$('#contextMenu').hide();
		}
	});

	$('#ColorPicker').on('blur', function() {
		if (currentItem.attr('class') == 'sticker') {
			currentItem.css('background-color', this.value);
			ws.send(JSON.stringify(encryptPayload({ 
				type: 'sticker_message', 
				roomId: roomId, 
				color: currentItem.css('background-color'), 
				message: currentItem.val(),
				sticker_id: currentItem.attr('id'),
				x: currentItem.css('left'),
				y: currentItem.css('top')
			}, encryptionKey)));
		}else if (currentItem.attr('class') == 'text') {
			currentItem.css('color', this.value);
			ws.send(JSON.stringify(encryptPayload({ 
				type: 'text_message', 
				roomId: roomId, 
				color: currentItem.css('color'), 
				message: currentItem.val(),
				text_id: currentItem.attr('id'),
				x: currentItem.css('left'),
				y: currentItem.css('top'),
				size: parseInt(currentItem.css('font-size'), 10)
			}, encryptionKey)));
		}
	});

	$('#textsize').on('blur', function() {
		if (currentItem.attr('class') == 'text') {
			currentItem.css('font-size', $(this).val() + 'px');
			ws.send(JSON.stringify(encryptPayload({ 
				type: 'text_message', 
				roomId: roomId, 
				color: currentItem.css('color'), 
				message: currentItem.val(),
				text_id: currentItem.attr('id'),
				x: currentItem.css('left'),
				y: currentItem.css('top'),
				size: parseInt(currentItem.css('font-size'), 10)
			}, encryptionKey)));
		}
	});

	$(document).click(function(event) {
		if (!$(event.target).closest('.context-menu').length && !$(event.target).closest('.sticker').length && !$(event.target).closest('.text').length) {
			$('#contextMenu').hide();
		}
	});

	ws.onopen = function() {
		$('#joinRoom').click(requestCurrentState);
		auto_connect();
	};
	
	ws.onclose = function() {
		view_error("サーバーとの接続が切れました！\n[Connection_lost]");
	};

	ws.onerror = function(error) {
		view_error("サーバーとの通信にエラーが発生しました！\n[Connection_error]");
	};

	$("#error_okay").on('click', function() {
		$("#error").hide();
	});
	
	window.addEventListener('beforeunload', function (event) {
		if($("textarea").length){
			event.preventDefault();
		}
	});
});