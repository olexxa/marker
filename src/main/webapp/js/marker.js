$(function() {

    var opts = {
        panel: { align : 'left' }
    };

    var ready = false;
    var markers = null;

    var callback = function() {
        if (!ready) {
            setTimeout(callback, 500);
            return;
        }
        $('#hover').data('ui-hover').markers(markers);
    };

    $('#uploader').uploader({
        status: $('#status'),
        hover: {
//          box: { w: $(window).width() - 100, h: $(window).height() - 80 },
            box: { w: 801, h: 601 },
            onMarkers: function(ms) {
                markers = ms;
                callback();
            },
            onImage: function(image, scale) {
                var options = $.extend(opts, {
                    image: {
                        src: image,
                        width: scale.scaled.w,
                        height: scale.scaled.h,
                        ratio: scale.ratio
                    }
                });
                $('#hover')
                    .show()
                    .hover(options);
                ready = true;
            }
        }
    });
});