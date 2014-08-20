(function( $, undefined ) {

    'use strict';

    const CONTEXT_PATH = '/',
          MARKER_ACTION = CONTEXT_PATH + 'photo/upload';

    $.widget('ui.marker', {

        _ready: false,

        options: {
            box: { w: 600, h: 400 },
            imageId: {},
            action: null,
            appearance: {}
        },

        _create: function() {
            var me = this;
            me._hover = $("<div/>")
                .attr('id', me.element.attr('id') + '_hover');
            me.element
                .empty()
                .append(me._hover);
        },

        _init: function() {
            var me = this;
            var image = $("#" + me.options.imageId)[0];
            __scale(image, me.options.box, function(image, scale) {
                me._onImage(image, scale);
            });
            __scale(image, null, function(image, ignored) {
                var blob = __dataURItoBlob(image);
                me._upload(blob);
            });
        },

        _onImage: function(image, scale) {
            var me = this;
            me._hw = me._hover.hover(
                $.extend(me.options.appearance, {
                    image: {
                        src: image,
                        width: scale.scaled.w,
                        height: scale.scaled.h,
                        ratio: scale.ratio
                    }
                })
            ).data('ui-hover');
        },

        _upload: function(image) {
            var me = this;
            var data = new FormData();
            data.append("submit", "file");
            data.append('file', image);
            $.ajax({
                url: MARKER_ACTION,
                type: 'post',
                dataType: 'json',
                data: data,
                processData: false,
                contentType: false,
                success: function (markers) {
                    me._ready = true;
                    console.debug('onMarkers');
                    me._hw.markers(markers)
                },
                fail: function (x, t, m) {
                    me._ready = false;
                    me._hw.status("failed: " + m);
                }
            });
        }

    });

    function __scale(img, box, callback) {
        var original = { w: img.width, h: img.height },
            boxed = box? box : original,// todo: optimize
            scale = __calculateScale(original, boxed);
        var canvas = document.createElement("canvas"),
            context = canvas.getContext("2d");
        canvas.width = scale.scaled.w;
        canvas.height = scale.scaled.h;
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL(), scale);
    }

    function __calculateScale(size, box) {
        var rX = size.w / box.w,
            rY = size.h / box.h,
            r = rX > rY ? rX : rY,
            scaled = { w: size.w / r, h: size.h / r },
            delta = { w: box.w - scaled.w, h: box.h - scaled.h };
        return {
            original: size, scaled: scaled, delta: delta, ratio: r
        };
    }

    function __dataURItoBlob(dataURI) {
        var split = dataURI.split(','),
            base64 = split[0].indexOf('base64') !== -1,
            byteString = base64?
                atob(split[1]) :
                decodeURI(split[1]),
            mimestring = split[0].split(':')[1].split(';')[0],
            content = [];
        for (var i = 0; i < byteString.length; i++)
            content[i] = byteString.charCodeAt(i)

        return new Blob(
            [new Uint8Array(content)],
            {type: mimestring});
    }

})( jQuery );