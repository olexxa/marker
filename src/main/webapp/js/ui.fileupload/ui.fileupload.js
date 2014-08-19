(function( $, undefined ) {

_CSS_INPUT_FILE = {
    position: 'absolute', top: 0, left: 0,
    width: '100%', height: '100%',
    overflow: 'hidden',
    margin: 0, padding: 0,
    opacity: 0, msFilter: 'alpha(opacity=0)',
    cursor: 'pointer'
};
_CSS_BROWSE_HINT = {
    fontSize: '12px',
    color: 'white',
    padding: '2px'
};
_CSS_OK = {
    color: 'white',
    backgroundColor: '#333333',
    borderColor: 'white',
    fontWeight: 'bold'
};
_CSS_ERROR = {
    color: 'red',
    backgroundColor: 'white',
    borderColor: 'black',
    fontWeight: 'normal'
};

_ALT_BROWSE = "- drag image above or click to browse -";

$.widget( 'ui.uploader', {

    options: {
        version: '1.0.0',
        action: '/photo/upload',
        image_browse_splash: 'img/back_car.png',
        width: 358,
        height: 256
    },

    // creates html components
    _create: function() {
        var me = this;
        me._id = me.element.attr('id') + '_uploader_';

        var browse = $('<div/>')
            .attr('id', me._id + 'browse')
            .css({ border: 'thin dotted white', background: '#666666' })
            .append([
                me._form = $('<form method="POST" enctype="multipart/form-data"/>')
                    .attr('id', me._id + 'form')
                    .attr('action', me.options.action)
                    .css({ padding: 0, margin: 0 })
                    .append([
                        $('<div>')
                            .css({ textAlign: 'left', padding: 5 })
                            .append(
                                $('<img border="0" alt="" src="img/header_upload.png" draggable="false"/>')
                        ),
                        $('<div>')
                            .css({ marginLeft: 7, marginRight: 7, padding: 0, backgroundColor: "#ff8900" })
                            .append([
                                me._splash = $('<img border="0" draggable="false"/>')
                                    .attr('src', me.options.image_browse_splash)
                                    .attr('alt', _ALT_BROWSE)
                                    .css({ border: "thin dotted #CCCCCC" }),
                                me._thumb = $('<img border="0" draggable="false" alt=""/>')
                                    .css({ border: "thin dotted #CCCCCC" })
                                    .hide()
                            ]),
                        me._hint = $('<div/>')
                            .css(_CSS_BROWSE_HINT)
                            .text(_ALT_BROWSE),
                        me._input = $('<input type="file" name="file"/>')
                            .attr('id', me._id + 'input')
                            .css(_CSS_INPUT_FILE)
                            .change(function() {
                                me.selectFile(this.files[0]);
                            }),
                        me._toolbar = $('<div/>')
                            .css({ padding: '4px' })
                            .append([
                                $('<span/>')
                                    .css({ color: 'white', fontSize: 15, cursor: 'pointer' })
                                    .click(function() {
                                        me._uploadFile();
                                    })
                                    .mouseover(function() { $(this).animate({ fontSize: 17 }); })
                                    .mouseout(function() { $(this).animate({ fontSize: 15 }); })
                                    .text("Detect"),
                                $('<span/>')
                                    .css({
                                        textAlign: 'right', position: 'absolute', right: 10,
                                        color: 'white', fontSize: 12, cursor: 'pointer'
                                    })
                                    .click(function() {
                                        me._deselectFile();
                                    })
                                    .text("cancel")

                            ])
                            .hide()
                    ])
            ]);
        me.element
            .css({
                width: me.options.width, height: me.options.height,
                position: 'absolute',
                left: '50%', top: '50%',
                marginLeft: -me.options.width / 2,
                marginTop: -me.options.height / 2
            })
            .empty()
            .append(browse);
    },

    _init: function() {
        var me = this;
        me.status("welcome");
    },

    status: function(text, style) {
        var me = this;

        var status = me.options.status;
        if (!status)
            return;
        if (!text) {
            status.hide();
            return;
        }

        if (!style)
            style = _CSS_OK;
        status
            .empty()
            .css(style)
            .show()
            .text(text);
    },

    selectFile: function(file) {
        var me = this;
        // check file
        if (!file) {
            me.status("Can't get file", _CSS_ERROR);
            return;
        }
        // check that file is image
        if (!file.type.match('image.*')) {
            me.status("File is not an image!", _CSS_ERROR);
            return;
        }

        var info = "File '" + file.name + "' " + Math.round(file.size / 1024) + "Kb";
        me.status(info);
        // scale uploaded image for thumbnail, scale to splash sizes
        var box = { w: me._splash.width(), h: me._splash.height() };
        me._scale(file, box, function(image) {
            // hide uploads
            me._splash.hide();
            me._hint.hide();
            me._input.hide();
            // show thumbnail and buttons
            me._toolbar.show();
            me._thumb
                .attr('src', image)
                .attr('alt', info)
                .show();

        });
    },

    // scale selected image file
    _scale: function(file, box, callback) {
        var me = this;

        // get uploaded file data
        me._image(file, function(image) {
            var img = new Image();
            img.onload = function() {
                var scale = __calculateScale(
                    { w: img.width, h: img.height },
                    box
                );
                // render it in the canvas
                var canvas = document.createElement("canvas");
                canvas.width = scale.scaled.w;
                canvas.height = scale.scaled.h;
                var context = canvas.getContext("2d");
                context.drawImage(img, 0, 0, canvas.width, canvas.height);
                callback(canvas.toDataURL(), scale);
            };
            img.src = image;
        });
    },

    // get uploaded file as dataUrl
    _image: function(file, callback) {
        var me = this;

        var reader = new FileReader();
        reader.onload = function(event) {
            callback(event.target.result);
        };
        reader.onerror = function(event) {
            me.status("Error reading image " + event.target.error.code, _CSS_ERROR);
        };
        reader.readAsDataURL(file);
    },

    _deselectFile: function() {
        var me = this;
        // clean the data
        me._form[0].reset();
        me.status();
        // hide thumbnail and buttons
        me._toolbar.hide();
        me._thumb
            .attr('src', '')
            .attr('alt', '')
            .hide();
        // show splash and upload
        me._splash.show();
        me._hint.show();
        me._input.show();
    },

    _uploadFile: function() {
        var me = this;
        if (me._uploading)
            return;

        me._uploading = true;
        me.status("uploading...");

        var file = me._input[0].files[0];

        if (me.options.hover)
            me._scale(file, me.options.hover.box, function (image, scale) {
                me.options.hover.onImage(image, scale);
            });

        // prepare form
        var data = new FormData();
        data.append("submit", "file");
        data.append('file', file);
        // and send it using ajax
        $.ajax({
            url: me.options.action,
            type: 'post',
            dataType: 'json',
            data: data,
            processData: false,
            contentType: false,
            success: function(response) {
                me._uploading = false;
                var found = response && response.length > 0;
                me.status(
                    (found? response.length : "no") + " marker" + (found && response.length == 1? "" : "s") + " found",
                    found? _CSS_OK : _CSS_ERROR);

                if (me.options.hover)
                    me.options.hover.onMarkers(response);

                me.element.hide();
            },
            fail: function(x, t, m) {
                me._uploading = false;
                me.status("failed: " + m);
            }
        });
    }

});

function __calculateScale(size, box) {
    var
        rX = size.w / box.w,
        rY = size.h / box.h,
        r = rX > rY? rX : rY,
        scaled = { w: size.w / r, h: size.h / r },
        delta = { w: box.w - scaled.w, h: box.h - scaled.h };
    return {
        original: size, scaled: scaled, delta: delta, ratio: r
    };
}

})( jQuery );