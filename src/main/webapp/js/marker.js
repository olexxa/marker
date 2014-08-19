$(function() {

    var hoverOpts = {
        borderColor: 'white',
        mesh: {
            color: 'yellow'
        },
        panel: {
            background: '#FFFF40'
        }
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
//                    box: { w: $(window).width() - 100, h: $(window).height() - 80 },
            box: { w: 801, h: 601 },
            onMarkers: function(ms) {
                markers = ms;
                callback();
            },
            onImage: function(image, scale) {
                $('#hover')
                    .show()
                    .hover({
                        flags: hoverOpts,
                        image: {
                            src: image,
                            width: scale.scaled.w,
                            height: scale.scaled.h,
                            ratio: scale.ratio
                        }
                    });
                ready = true;
            }
        }
    });
});