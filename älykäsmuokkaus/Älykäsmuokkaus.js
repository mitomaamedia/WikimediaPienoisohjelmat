/** Quick Edit **/

// Edit sections of a page without leaving the article
// [[User:BrandonXLF/QuickEdit]]
// By [[User:BrandonXLF]]

$.when(mw.loader.using('oojs-ui-core'), $.ready).done(function(){
	var mobile = mw.config.get('skin') === 'minerva';
	var US = 'quickedit-';
	if (mobile) {
		mw.util.addCSS('.mw-editsection{white-space:nowrap}.content .collapsible-heading .' + US + 'section{visibility:hidden}.content .collapsible-heading.open-block .' + US + 'section{visibility:visible}');
	}
	$(document.body).on('click', function(e){
		var el = $(e.target);
		if (el.hasClass(US + 'editlink') && !el.hasClass(US + 'loading')) {
			e.preventDefault();
			e.stopImmediatePropagation();
			$('.' + US + 'hide').removeClass(US + 'hide');
			$('.' + US + 'heading').removeClass(US + 'heading');
			$('#' + US + 'editor, #' + US + 'preview').remove();
			var targetLink = el.siblings('.' + US + 'target').last();
			var title = decodeURIComponent((/[\?&]title=([^&#]*)/.exec(targetLink.attr('href')) || new RegExp('.*' + mw.config.get('wgArticlePath').replace(/\$1/,'([^?]+)')).exec(targetLink.attr('href')))[1]);
			var sectionID = /[\?&]v?e?section=T?-?(\d*)/.exec(targetLink.attr('href'))[1];
			var level = 0;
			var heading = el.closest('h1,h2,h3,h4,h5,h6');
			var pageID;
			var progress = function(ID, parent){
				$('#' + US + ID).remove();
				parent.after(new OO.ui.ProgressBarWidget().$element.css({marginBottom: '0.5em', borderRadius: 0, maxWidth: 'none', boxShadow: 'none'}).attr('id', US + ID));
			};
			if (!$.contains(document.getElementsByClassName('mw-parser-output')[0], heading[0])) {
				heading = $('.mw-parser-output').children().first();
			}
			progress('editor', heading);
			$.get(mw.config.get('wgScript'), {
				title: title,
				section: sectionID,
				action: 'raw'
			}).done(function(full){
				$.post(mw.config.get('wgScriptPath') + '/api.php', {
					action: 'query',
					prop: 'revisions',
					rvprop: 'timestamp',
					titles: title,
					curtimestamp: 'true',
					format: 'json'
				}).done(function(base){
					var start = base.curtimestamp;
					for (pageID in base.query.pages) {
						base = base.query.pages[pageID].revisions[0].timestamp;
					}
					full = full.replace(/\s+$/, '');
					var saving = false;
					var expanded = false;
					var part = full.split(/(?:^|\n)(=+.+=+)/,3).join('');
					var post = full.replace(part, '');
					heading.nextUntil('#toc,h2:has(*),h3,h4,h5,h6').addClass(US + 'hide');
					var fullSection = heading.nextUntil(level == 6 ? 'h1,h2:has(*),h3,h4,h5,h6' : level == 5 ? 'h1,h2:has(*),h3,h4,h5' : level == 4 ? 'h1,h2:has(*),h3,h4' : level == 3 ? 'h1,h2:has(*),h3' : level == 2 ? 'h1,h2:has(*),#toc' : 'h1');
					if (heading.is('h1,h2,h3,h4,h5,h6')) {
						heading.addClass(US + 'heading');
					} else {
						heading.addClass(US + 'hide');
					}
					var $editor = $('<table id="' + US + 'editor" style="margin-bottom:0.5em;background-color:#eaecf0;border-spacing:0;">');
					var textarea = new OO.ui.MultilineTextInputWidget({
						rows: 1,
						maxRows: 20,
						autosize: true,
						value: part
					});
					var summary = new OO.ui.TextInputWidget({
						value: heading.is('h1,h2,h3,h4,h5,h6') ? '/* ' + heading.find('.mw-headline').text() + ' */ ' : ''
					});
					var minor = new OO.ui.CheckboxInputWidget();
					var save = new OO.ui.ButtonInputWidget({
						label: 'Tallenna',
						title: 'Tallenna muokkauksesi',
						flags: ['primary','progressive']
					});
					var preview = new OO.ui.ButtonInputWidget({
						label: 'Esikatsele',
						title: 'Esikatsele uutta wikitekstiä'
					});
					var compare = new OO.ui.ButtonInputWidget({
						label: 'Ero',
						title: 'Tarkastele nykyisen muutoksesi ja edellisen version välistä eroa'
					});
					var cancel = new OO.ui.ButtonInputWidget({
						useInputTag: true,
						label: 'Peruuta',
						title: 'Sulje Älykäs muokkaus -ikkuna ja hylkää muutokset',
						flags: ['secondary','destructive']
					});
					var more = new OO.ui.ButtonInputWidget({
						label: '+',
						title: 'Muokkaa koko osiota (mukaan lukien alalohkot)'
					});
					textarea.$element.find('textarea').css('border-radius','0');
					save.on('click', function(){
						var saveText = (expanded ? textarea.getValue() : textarea.getValue() + post).replace(/\s+$/,'') + '\n\n';
						if (saving) return;
						saving = true;
						save.setLabel('Tallennetaan...');
						compare.setDisabled(true);
						preview.setDisabled(true);
						cancel.setDisabled(true);
						more.setDisabled(true);
						$.post(mw.config.get('wgScriptPath') + '/api.php', {
							action: 'edit',
							format: 'json',
							title: title,
							section: sectionID,
							summary: summary.getValue(),
							text: saveText,
							minor: minor.isSelected() ? true : undefined,
							notminor: minor.isSelected() ? undefined : true,
							starttimestamp: start,
							basetimestamp: base,
							token: mw.user.tokens.get('csrfToken'),
						}).done(function(r){
							if (r.error && r.error.code == 'editconflict') {
								mw.notify('An edit conflict has occurred. Please merge your changes with the conflicting changes.', {type: 'error', tag: US});
								$.get(mw.config.get('wgScript'), {
									title: title,
									section: sectionID,
									action: 'raw'
								}).done(function(newText){
									$.post(mw.config.get('wgScriptPath') + '/api.php',{
										action: 'query',
										prop: 'revisions',
										rvprop: 'timestamp',
										titles: title,
										curtimestamp: 'true',
										format: 'json'
									}).done(function(newBase){
										start = newBase.curtimestamp;
										for (pageID in newBase.query.pages) {
											base = newBase.query.pages[pageID].revisions[0].timestamp;
										}
									});
									function syncSize(){
										var t1 = textarea.adjustSize().$element.find('textarea').first();
										var t2 = textarea2.adjustSize().$element.find('textarea').first();
										var rows = Math.max(t1.attr('rows'),t2.attr('rows'));
										var height = Math.max(t1.height(),t2.height());
										t1.attr('rows',rows).height(height);
										t2.attr('rows',rows).height(height);
									}
									compare.setDisabled(false);
									preview.setDisabled(false);
									cancel.setDisabled(false);
									more.$element.remove();
									saving = false;
									expanded = true;
									var oldText = (expanded ? textarea.getValue() : textarea.getValue() + post).replace(/\s+$/,'');
									newText = newText.replace(/\s+$/,'');
									var textarea2 = new OO.ui.MultilineTextInputWidget({
										rows: 1,
										maxRows: 20,
										autosize: true,
										value: oldText,
									});
									textarea.setValue(newText);
									textarea.on('change', syncSize);
									textarea2.on('change', syncSize);
									save.setLabel('Save');
									textarea.$element.closest('td').empty().append($('<table style="width:100%;border:1px solid #a2a9b1;border-bottom:none;">')
										.append('<tr><th style="width:50%;">Their version (to be saved)</th><th style="width:50%;">Your version</th></tr>')
										.append($('<tr>')
											.append($('<td style="width:50%;">')
												.append(textarea.$element.css({width: '100%',maxWidth: '100%', fontFamily: 'monospace, monospace'}))
											)
											.append($('<td style="width:50%;">')
												.append(textarea2.$element.css({width: '100%',maxWidth: '100%', fontFamily: 'monospace, monospace'}))
											)
										)
									);
									syncSize();
									progress('preview', $editor);
									mw.loader.load('mediawiki.diff.styles');
									$.post(mw.config.get('wgScriptPath') + '/api.php',{
										action: 'compare',
										format: 'json',
										fromslots: 'main',
										'fromtext-main': newText.replace(/\s+$/,'') + '\n\n',
										fromtitle: title,
										frompst: 'true',
										toslots: 'main',
										'totext-main': oldText.replace(/\s+$/,'') + '\n\n',
										totitle: title,
										topst: 'true'
									}).done(function(res){
										$('#' + US + 'preview').remove();
										$('<div>').html(res.compare['*'] ? '<table class="diff"><tr><td style="width:1em;"></td><td style="width:50%;"></td><td style="width:1em;"></td><td style="width:50%;"></td></tr>' + res.compare['*'] + '</table>' : 'No differences.').css({padding: '5px', marginBottom: '.5em', border: '1px solid rgb(162, 169, 177)'}).attr('id', US + 'preview').insertAfter($editor);
									});
								}).fail(function(){
									mw.notify('An error occurred while getting the new revision, perhaps the section was deleted. Try reloading the page.', {type: 'error', tag: US});
								});
								return;
							}
							if (r.error) {
								compare.setDisabled(false);
								preview.setDisabled(false);
								cancel.setDisabled(false);
								more.setDisabled(expanded);
								mw.notify(r.error.info,{type: 'error', tag: US});
								saving = false;
								save.setLabel('Save');
								return;
							}
							$.get(mw.config.get('wgScriptPath') + '/api.php', {
								action: 'parse',
								page: mw.config.get('wgPageName'),
								prop: 'text|categorieshtml',
								format: 'json'
							}).done(function(res){
								$('#' + US + 'editor, .' + US + 'section').remove();
								$('.mw-parser-output').replaceWith(res.parse.text['*']);
								mw.hook('wikipage.content').fire($('#mw-content-text'));
								$('.catlinks').replaceWith(res.parse.categorieshtml['*']);
								mw.hook('wikipage.categories').fire($('.catlinks'));
								saving = false;
							});
						});
					});
					preview.on('click', function(){
						progress('preview', $editor);
						$.post(mw.config.get('wgScriptPath') + '/api.php',{
							action: 'parse',
							format: 'json',
							title: title,
							prop: 'text',
							pst: 'true',
							disablelimitreport: 'true',
							disableeditsection: 'true',
							sectionpreview: 'true',
							disabletoc: 'true',
							text: textarea.getValue().replace(/\s+$/,'') + '\n\n'
						}).done(function(r){
							$('#' + US + 'preview').remove();
							$('<div style="overflow:hidden;">').html(r.parse.text['*'] + '<div style="clear:both;"></div>').css({padding: '5px', marginBottom: '.5em', border: '1px solid rgb(162, 169, 177)'}).attr('id', US + 'preview').insertAfter($editor);
						});
					});
					compare.on('click', function(){
						progress('preview', $editor);
						mw.loader.load('mediawiki.diff.styles');
						$.post(mw.config.get('wgScriptPath') + '/api.php',{
							action: 'compare',
							format: 'json',
							fromslots: 'main',
							'fromtext-main': part + (expanded ? post : ''),
							fromtitle: title,
							frompst: 'true',
							toslots: 'main',
							'totext-main': textarea.getValue().replace(/\s+$/,'') + '\n\n',
							totitle: title,
							topst: 'true'
						}).done(function(r){
							$('#' + US + 'preview').remove();
							$('<div style="overflow:hidden;">').html(r.compare['*'] ? '<table class="diff"><tr><td style="width:1em;"></td><td style="width:50%;"></td><td style="width:1em;"></td><td style="width:50%;"></td></tr>' + r.compare['*'] + '</table>' : 'No differences.').css({padding: '5px', marginBottom: '.5em', border: '1px solid rgb(162, 169, 177)'}).attr('id', US + 'preview').insertAfter($editor);
						});
					});
					cancel.on('click', function(){
						$('#' + US + 'editor, #' + US + 'preview').remove();
						fullSection.removeClass(US + 'hide');
						$('.' + US + 'heading').removeClass(US + 'heading');
					});
					more.on('click', function(){
						expanded = true;
						textarea.setValue(textarea.getValue() + post);
						fullSection.addClass(US + 'hide');
						more.setDisabled(true);
					});
					$('#' + US + 'editor').remove();
					heading.after($editor
						.append($('<tr>')
							.append($('<td colspan="3" style="padding:0;">')
								.append(textarea.$element.css({width:'100%',maxWidth:'100%', fontFamily:'monospace, monospace'}))
							)
						)
						.append($('<tr>')
							.append('<td style="padding:10px 5px 10px 10px;border-left:1px solid #a2a9b1;">Muokkausyhteenveto:</td>')
							.append($('<td style="padding:10px 0 10px 0;width:100%;">').append(summary.$element.css({width: '100%', maxWidth: '100%'})))
							.append($('<td style="padding:10px 10px 10px 5px;border-right:1px solid #a2a9b1;">')
								.append(new OO.ui.FieldsetLayout().addItems([
									new OO.ui.FieldLayout(minor, {label: 'Pieni\xa0muutos?', align: 'inline'})
								]).$element)
							)
						)
						.append($('<tr>')
							.append($('<td style="border:1px solid #a2a9b1;border-top:none;padding:0 10px 10px 10px;" colspan="3">')
								.append(save.$element)
								.append(preview.$element)
								.append(compare.$element)
								.append(part != full ? more.$element : '')
								.append(cancel.$element)
								.append(title != mw.config.get('wgPageName') ? '<span style="margin-left:2px;">Editing page: <a href="' + mw.config.get('wgArticlePath').replace('$1',title) + '"><b>' + title.replace(/_/g,' ') + '</b></a></span>' : '')
							)
						)
					);
				});
			}).fail(function(){
				$('#' + US + 'editor').remove();
				mw.notify('An error occurred while getting section wikitext, perhaps it was deleted. Try reloading the page.',{type:'error',tag:US});
			});
		}
	});
	mw.hook('wikipage.content').add(function(){
		$('.mw-editsection').each(function(){
			$('[href*="title="][href*="section="]', this).last().after((mobile ? '' : '<span class="' + US + 'section"> | </span>') + '<a class="' + US + 'section ' + US + 'editlink">' + (mobile ? '&nbsp;Q' : 'quick edit') + '</a>').addClass(US + 'target');
		});
	});
});
