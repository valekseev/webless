package org.al.servlets;

import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel.MapMode;
import java.util.concurrent.ConcurrentHashMap;

import javax.websocket.OnMessage;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;

import org.al.SpammerService;

//@ServerEndpoint("/tail")
public class FileViewer {
    private static ConcurrentHashMap<String, ByteBuffer> cache = new ConcurrentHashMap<>();

    @OnMessage
    public void onMessage(Session session, String msg) {
        // Look for a file mapped buffer in the cache
        String path = SpammerService.FILENAME;
        File file = new File(path);
        try {

            ByteBuffer mapped = cache.get(path);
            if (mapped == null) {
                try (RandomAccessFile raf = new RandomAccessFile(file, "r")) {
                    ByteBuffer buf = raf.getChannel().map(MapMode.READ_ONLY, 0, raf.length());
                    mapped = cache.putIfAbsent(path, buf);
                    if (mapped == null) mapped = buf;
                }
            }

            session.getBasicRemote().sendText(msg);
        } catch (IOException e) {}
    }
}
