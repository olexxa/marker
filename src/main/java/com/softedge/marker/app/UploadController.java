package com.softedge.marker.app;

import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.io.*;
import java.util.List;

import com.softedge.marker.core.IOUtils;
import org.apache.log4j.Logger;
import org.glassfish.jersey.media.multipart.FormDataContentDisposition;
import org.glassfish.jersey.media.multipart.FormDataParam;

import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.opencv.core.Mat;
import org.opencv.core.Size;
import org.opencv.highgui.Highgui;

import com.softedge.marker.detector.Marker;
import com.softedge.marker.detector.MarkerDetector;

import static javax.ws.rs.core.Response.Status;

/**
 * @author <a href="mailto:me@olexxa.com">Alexey Adamov</a>
 */
@Path("/photo")
public class UploadController {

    private final static Logger log = Logger.getLogger(UploadController.class);

    private static File folder;
    private static MarkerDetector detector;

    @POST
    @Path("/upload")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    public Response upload(
        @Nullable @FormDataParam("file") InputStream inputStream,
        @Nullable @FormDataParam("file") FormDataContentDisposition contentDispositionHeader
    ) {
        log.debug("Uploading file");
        if (inputStream == null || contentDispositionHeader  == null) {
            log.debug("  wrong request params, no 'file' found");
            return Response
                .status(Status.INTERNAL_SERVER_ERROR)
                .entity("  wrong request params, 'file' required")
                .build();
        }

        String originalName = contentDispositionHeader.getFileName();
        File file;
        try {
            file = saveFile(inputStream, originalName);
        } catch (IOException ioe) {
            log.debug("  can't save uploaded file: " + ioe.getMessage());
            return Response
                .status(Status.INTERNAL_SERVER_ERROR)
                .entity("Error saving file: " + ioe.getMessage())
                .build();
        } finally {
            IOUtils.silentlyClose(inputStream);
        }

        List<Marker> markers = recognize(file);
        log.debug("  detected: " + markers);
        return Response
            .status(Status.OK)
            .entity(markers)
            .build();
    }

    @NotNull
    private List<Marker> recognize(@NotNull File file) {
        if (detector == null)
            detector = new MarkerDetector(100, new Size(100, 100));

        Mat image = Highgui.imread(file.getAbsolutePath());
        detector.processImage(image);
        return detector.getMarkers();
    }

    @NotNull
    private File saveFile(
        @NotNull InputStream is, @NotNull String filename
    ) throws IOException {
        if (folder == null)
            folder = new File(com.softedge.marker.Marker.home + "/tmp/");

        OutputStream os = null;
        try {
            File file = File.createTempFile("marker", filename, folder);
            os = new FileOutputStream(file);
            IOUtils.copy(is, os);
            return file;
        } finally {
            IOUtils.silentlyClose(os);
        }
    }

}
